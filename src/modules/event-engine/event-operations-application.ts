import type { MutationContext } from "../../application/core-services";
import { DomainConflictError, TenantBoundaryError } from "../../persistence/models";
import { EventReconciliationApplication } from "./event-reconciliation-application";
import {
  EventEngineError,
  type EventCheckin,
  type EventPayment,
  type EventPaymentStatus,
  type EventQrClaims,
} from "./models";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAllowedPaymentTransition(
  current: EventPaymentStatus,
  next: EventPaymentStatus,
): boolean {
  const transitions: Readonly<Record<EventPaymentStatus, readonly EventPaymentStatus[]>> = {
    not_required: [],
    pending: ["authorized", "paid", "failed", "cancelled"],
    authorized: ["paid", "failed", "cancelled"],
    paid: ["refunded"],
    failed: ["pending", "cancelled"],
    refunded: [],
    cancelled: [],
  };
  return transitions[current].includes(next);
}

export class EventOperationsApplication extends EventReconciliationApplication {  async updatePaymentStatus(
    tenantId: string,
    actorMembershipId: string,
    registrationId: string,
    nextStatus: EventPaymentStatus,
    amountMinor: number,
    currency: string,
    context: MutationContext,
  ): Promise<EventPayment> {
    await this.requireEventPermission(tenantId, actorMembershipId, "manage");
    const replay = await this.replayEventResult<EventPayment>(
      tenantId, "event.payment.status.update",
      { tenantId, actorMembershipId, registrationId, nextStatus, amountMinor, currency },
      context,
    );
    if (replay.found) return replay.result;
    const payment = await this.eventRepository.getPayment(tenantId, registrationId);
    if (!payment) throw new TenantBoundaryError();
    if (
      !isAllowedPaymentTransition(payment.status, nextStatus)
      || !Number.isSafeInteger(amountMinor)
      || amountMinor < 0
      || !/^[A-Z]{3}$/u.test(currency)
    ) {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.payment.status.update",
      {
        tenantId,
        actorMembershipId,
        registrationId,
        nextStatus,
        amountMinor,
        currency,
      },
      context,
      (timestamp) => ({
        result: {
          ...payment,
          status: nextStatus,
          amountMinor,
          currency,
          version: payment.version + 1,
        },
        statements: [
          this.db
            .prepare(
              `UPDATE event_payments
               SET status = ?1, amount_minor = ?2, currency = ?3,
                   version = version + 1, updated_at = ?4
               WHERE tenant_id = ?5 AND registration_id = ?6
                 AND version = ?7`,
            )
            .bind(
              nextStatus,
              amountMinor,
              currency,
              timestamp,
              tenantId,
              registrationId,
              payment.version,
            ),
        ],
        audit: {
          action: "event.payment.status.update",
          resourceType: "event_payment",
          resourceReference: payment.id,
          reasonCode: nextStatus.toUpperCase(),
        },
      }),
    );
  }

  async issueCheckinQrToken(
    tenantId: string,
    actorMembershipId: string,
    registrationId: string,
    expiresAt: number,
  ): Promise<string> {
    await this.requireEventPermission(tenantId, actorMembershipId, "checkin");

    const registration = await this.eventRepository.getRegistration(
      tenantId,
      registrationId,
    );
    if (!registration || registration.status !== "confirmed") {
      throw new EventEngineError("EVENT_CHECKIN_NOT_ELIGIBLE");
    }
    const now = this.currentTimestamp();
    if (expiresAt <= now || expiresAt > now + 24 * 60 * 60 * 1000) {
      throw new EventEngineError("EVENT_QR_INVALID");
    }
    const claims: EventQrClaims = {
      version: 1,
      tenantId,
      eventId: registration.eventId,
      sessionId: registration.eventSessionId,
      registrationId,
      expiresAt,
      nonce: this.uuidv7.generate(),
    };
    return this.qrTokens.issue(claims);
  }

  async checkIn(
    tenantId: string,
    actorMembershipId: string,
    registrationId: string,
    method: "manual" | "qr",
    qrToken: string | null,
    context: MutationContext,
  ): Promise<EventCheckin> {
    await this.requireEventPermission(tenantId, actorMembershipId, "checkin");
    const fingerprintInput = {
      tenantId, actorMembershipId, registrationId, method,
      tokenDigest: qrToken ? await this.qrTokens.digest(qrToken) : null,
    };
    const replay = await this.replayEventResult<EventCheckin>(
      tenantId, "event.checkin.verify", fingerprintInput, context,
    );
    if (replay.found) return replay.result;
    const registration = await this.eventRepository.getRegistration(
      tenantId,
      registrationId,
    );
    if (!registration || registration.status !== "confirmed") {
      throw new EventEngineError("EVENT_CHECKIN_NOT_ELIGIBLE");
    }
    let tokenDigest: string | null = null;
    if (method === "qr") {
      if (!qrToken) throw new EventEngineError("EVENT_QR_INVALID");
      const claims = await this.qrTokens.verify(
        qrToken,
        this.currentTimestamp(),
      );
      if (
        claims.tenantId !== tenantId
        || claims.eventId !== registration.eventId
        || claims.sessionId !== registration.eventSessionId
        || claims.registrationId !== registrationId
      ) {
        throw new EventEngineError("EVENT_QR_INVALID");
      }
      tokenDigest = await this.qrTokens.digest(qrToken);
    } else if (qrToken !== null) {
      throw new EventEngineError("EVENT_QR_INVALID");
    }
    const id = this.uuidv7.generate();
    try {
      return await this.executeIdempotent(
        { scopeType: "tenant", tenantId },
        "event.checkin.verify",
        {
          tenantId,
          actorMembershipId,
          registrationId,
          method,
          tokenDigest,
        },
        context,
        (timestamp) => ({
          result: {
            id,
            tenantId,
            eventId: registration.eventId,
            eventSessionId: registration.eventSessionId,
            registrationId,
            verifiedByMembershipId: actorMembershipId,
            method,
            status: "verified",
            checkedInAt: timestamp,
          } satisfies EventCheckin,
          statements: [
            this.db
              .prepare(
                `INSERT INTO event_checkins (
                  id, tenant_id, event_id, event_session_id, registration_id,
                  verified_by_membership_id, method, token_digest, status,
                  checked_in_at, revoked_at, created_at, updated_at
                ) VALUES (
                  ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
                  'verified', ?9, NULL, ?9, ?9
                )`,
              )
              .bind(
                id,
                tenantId,
                registration.eventId,
                registration.eventSessionId,
                registrationId,
                actorMembershipId,
                method,
                tokenDigest,
                timestamp,
              ),
          ],
          audit: {
            action: "event.checkin.verify",
            resourceType: "event_checkin",
            resourceReference: id,
            reasonCode: method === "qr" ? "QR_VERIFIED" : "MANUAL_VERIFIED",
          },
        }),
      );
    } catch (error) {
      const message = errorMessage(error);
      if (message.includes("event_checkin_not_eligible")) {
        throw new EventEngineError("EVENT_CHECKIN_NOT_ELIGIBLE");
      }
      if (
        error instanceof DomainConflictError
        && error.code === "DUPLICATE_ACTIVE_RECORD"
      ) {
        throw new EventEngineError("EVENT_DUPLICATE_CHECKIN");
      }
      throw error;
    }
  }}
