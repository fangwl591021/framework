import type { MutationContext } from "../../application/core-services";
import { DomainConflictError, TenantBoundaryError } from "../../persistence/models";
import { EventShareApplication } from "./event-share-application";
import {
  EventEngineError,
  type EventRegistration,
  type RegisterForEventInput,
  type RegistrationAnswerInput,
} from "./models";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}



export class EventRegistrationApplication extends EventShareApplication {
  async register(
    tenantId: string,
    input: RegisterForEventInput,
    context: MutationContext,
  ): Promise<EventRegistration> {
    this.validateText("source adapter", input.sourceAdapter, 40);
    this.validateText("notification adapter", input.notificationAdapter, 40);
    const [event, session] = await Promise.all([
      this.eventRepository.getEvent(tenantId, input.eventId),
      this.eventRepository.getSession(tenantId, input.eventId, input.sessionId),
      this.requireActivePlatformUser(input.platformUserId),
    ]);
    if (!event || !session) throw new TenantBoundaryError();
    const now = this.currentTimestamp();
    if (
      event.status !== "published"
      || session.status !== "scheduled"
      || now < event.registrationOpensAt
      || now >= event.registrationClosesAt
    ) {
      throw new EventEngineError("EVENT_REGISTRATION_CLOSED");
    }
    const answers = await this.validateAnswers(
      tenantId,
      event.id,
      input.answers,
    );
    const initialStatus =
      session.confirmedCount < session.capacity && session.waitlistedCount === 0
        ? "confirmed"
        : "waitlisted";
    try {
      return await this.insertRegistration(
        tenantId,
        event.paymentMode,
        input,
        answers,
        initialStatus,
        context,
      );
    } catch (error) {
      const message = errorMessage(error);
      if (initialStatus === "confirmed" && message.includes("event_capacity_full")) {
        try {
          return await this.insertRegistration(
            tenantId,
            event.paymentMode,
            input,
            answers,
            "waitlisted",
            context,
          );
        } catch (waitlistError) {
          this.translateRegistrationError(waitlistError);
        }
      }
      this.translateRegistrationError(error);
    }
  }

  private async insertRegistration(
    tenantId: string,
    paymentMode: "free" | "status_only",
    input: RegisterForEventInput,
    answers: Awaited<ReturnType<EventRegistrationApplication["validateAnswers"]>>,
    status: "confirmed" | "waitlisted",
    context: MutationContext,
  ): Promise<EventRegistration> {
    const registrationId = this.uuidv7.generate();
    const paymentId = this.uuidv7.generate();
    const notificationId = this.uuidv7.generate();
    const answerRows = answers.map(({ field, valueJson }) => ({
      id: this.uuidv7.generate(),
      field,
      valueJson,
    }));
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.registration.create",
      { tenantId, input },
      context,
      (timestamp) => {
        const result: EventRegistration = {
          id: registrationId,
          tenantId,
          eventId: input.eventId,
          eventSessionId: input.sessionId,
          platformUserId: input.platformUserId,
          status,
          sourceAdapter: input.sourceAdapter,
          version: 1,
          registeredAt: timestamp,
        };
        return {
          result,
          statements: [
            this.db
              .prepare(
                `INSERT INTO event_registrations (
                  id, tenant_id, event_id, event_session_id, platform_user_id,
                  status, source_adapter, version, registered_at, updated_at,
                  cancelled_at
                ) VALUES (
                  ?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8, NULL
                )`,
              )
              .bind(
                registrationId,
                tenantId,
                input.eventId,
                input.sessionId,
                input.platformUserId,
                status,
                input.sourceAdapter,
                timestamp,
              ),
            ...answerRows.map(({ id, field, valueJson }) =>
              this.db
                .prepare(
                  `INSERT INTO event_registration_answers (
                    id, tenant_id, event_id, registration_id, form_field_id,
                    value_json, created_at, updated_at
                  ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`,
                )
                .bind(
                  id,
                  tenantId,
                  input.eventId,
                  registrationId,
                  field.id,
                  valueJson,
                  timestamp,
                ),
            ),
            this.db
              .prepare(
                `INSERT INTO event_payments (
                  id, tenant_id, event_id, registration_id, status,
                  amount_minor, currency, version, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, 0, 'TWD', 1, ?6, ?6)`,
              )
              .bind(
                paymentId,
                tenantId,
                input.eventId,
                registrationId,
                paymentMode === "free" ? "not_required" : "pending",
                timestamp,
              ),
            this.db
              .prepare(
                `INSERT INTO event_notifications (
                  id, tenant_id, event_id, registration_id,
                  recipient_platform_user_id, notification_type, adapter_key,
                  status, created_at, updated_at, sent_at
                ) VALUES (
                  ?1, ?2, ?3, ?4, ?5, ?6, ?7,
                  'pending', ?8, ?8, NULL
                )`,
              )
              .bind(
                notificationId,
                tenantId,
                input.eventId,
                registrationId,
                input.platformUserId,
                status === "confirmed"
                  ? "registration_confirmed"
                  : "registration_waitlisted",
                input.notificationAdapter,
                timestamp,
              ),
          ],
          audit: {
            action: "event.registration.create",
            resourceType: "event_registration",
            resourceReference: registrationId,
            reasonCode: status === "confirmed" ? "CONFIRMED" : "WAITLISTED",
          },
        };
      },
    );
  }

  private translateRegistrationError(error: unknown): never {
    const message = errorMessage(error);
    if (message.includes("event_capacity_full")) {
      throw new EventEngineError("EVENT_CAPACITY_FULL");
    }
    if (message.includes("event_waitlist_full")) {
      throw new EventEngineError("EVENT_WAITLIST_FULL");
    }
    if (
      error instanceof DomainConflictError
      && error.code === "DUPLICATE_ACTIVE_RECORD"
    ) {
      throw new EventEngineError("EVENT_DUPLICATE_REGISTRATION");
    }
    throw error;
  }

  async updateRegistrationAnswers(
    tenantId: string,
    registrationId: string,
    platformUserId: string,
    answers: readonly RegistrationAnswerInput[],
    context: MutationContext,
  ): Promise<EventRegistration> {
    const registration = await this.eventRepository.getRegistration(
      tenantId,
      registrationId,
    );
    if (!registration) throw new TenantBoundaryError();
    if (
      registration.platformUserId !== platformUserId
      || registration.status === "cancelled"
    ) {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    const validated = await this.validateAnswers(
      tenantId,
      registration.eventId,
      answers,
    );
    const answerRows = validated.map(({ field, valueJson }) => ({
      id: this.uuidv7.generate(),
      fieldId: field.id,
      valueJson,
    }));
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.registration.answers.update",
      { tenantId, registrationId, platformUserId, answers },
      context,
      (timestamp) => ({
        result: { ...registration, version: registration.version + 1 },
        statements: [
          this.db
            .prepare(
              `DELETE FROM event_registration_answers
               WHERE tenant_id = ?1 AND registration_id = ?2`,
            )
            .bind(tenantId, registrationId),
          ...answerRows.map(({ id, fieldId, valueJson }) =>
            this.db
              .prepare(
                `INSERT INTO event_registration_answers (
                  id, tenant_id, event_id, registration_id, form_field_id,
                  value_json, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`,
              )
              .bind(
                id,
                tenantId,
                registration.eventId,
                registrationId,
                fieldId,
                valueJson,
                timestamp,
              ),
          ),
          this.db
            .prepare(
              `UPDATE event_registrations
               SET version = version + 1, updated_at = ?1
               WHERE tenant_id = ?2 AND id = ?3
                 AND platform_user_id = ?4
                 AND status IN ('confirmed', 'waitlisted')`,
            )
            .bind(timestamp, tenantId, registrationId, platformUserId),
        ],
        audit: {
          action: "event.registration.answers.update",
          resourceType: "event_registration",
          resourceReference: registrationId,
          reasonCode: "UPDATED",
        },
      }),
    );
  }

  async cancelRegistration(
    tenantId: string,
    registrationId: string,
    platformUserId: string,
    notificationAdapter: string,
    context: MutationContext,
  ): Promise<EventRegistration> {
    this.validateText("notification adapter", notificationAdapter, 40);
    const replay = await this.replayEventResult<EventRegistration>(
      tenantId, "event.registration.cancel",
      { tenantId, registrationId, platformUserId, notificationAdapter }, context,
    );
    if (replay.found) return replay.result;
    const registration = await this.eventRepository.getRegistration(
      tenantId,
      registrationId,
    );
    if (!registration) throw new TenantBoundaryError();
    if (
      registration.platformUserId !== platformUserId
      || registration.status === "cancelled"
      || await this.eventRepository.getCheckin(tenantId, registrationId)
    ) {
      throw new EventEngineError("EVENT_INVALID_STATE");
    }
    const promotion =
      registration.status === "confirmed"
        ? await this.eventRepository.findEarliestWaitlisted(
            tenantId,
            registration.eventSessionId,
            registrationId,
          )
        : null;
    const cancellationNotificationId = this.uuidv7.generate();
    const promotionNotificationId = promotion ? this.uuidv7.generate() : null;
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "event.registration.cancel",
      { tenantId, registrationId, platformUserId, notificationAdapter },
      context,
      (timestamp) => ({
        result: {
          ...registration,
          status: "cancelled",
          version: registration.version + 1,
        },
        statements: [
          this.db
            .prepare(
              `UPDATE event_registrations
               SET status = 'cancelled', cancelled_at = ?1,
                   version = version + 1, updated_at = ?1
               WHERE tenant_id = ?2 AND id = ?3
                 AND platform_user_id = ?4
                 AND status IN ('confirmed', 'waitlisted')`,
            )
            .bind(timestamp, tenantId, registrationId, platformUserId),
          ...(promotion
            ? [
                this.db
                  .prepare(
                    `UPDATE event_registrations
                     SET status = 'confirmed', version = version + 1,
                         updated_at = ?1
                     WHERE tenant_id = ?2 AND id = ?3
                       AND status = 'waitlisted'`,
                  )
                  .bind(timestamp, tenantId, promotion.id),
              ]
            : []),
          this.db
            .prepare(
              `UPDATE event_payments
               SET status = 'cancelled', version = version + 1, updated_at = ?1
               WHERE tenant_id = ?2 AND registration_id = ?3
                 AND status IN ('pending', 'authorized', 'failed')`,
            )
            .bind(timestamp, tenantId, registrationId),
          this.db
            .prepare(
              `INSERT INTO event_notifications (
                id, tenant_id, event_id, registration_id,
                recipient_platform_user_id, notification_type, adapter_key,
                status, created_at, updated_at, sent_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, 'registration_cancelled', ?6,
                'pending', ?7, ?7, NULL
              )`,
            )
            .bind(
              cancellationNotificationId,
              tenantId,
              registration.eventId,
              registrationId,
              platformUserId,
              notificationAdapter,
              timestamp,
            ),
          ...(promotion && promotionNotificationId
            ? [
                this.db
                  .prepare(
                    `INSERT INTO event_notifications (
                      id, tenant_id, event_id, registration_id,
                      recipient_platform_user_id, notification_type,
                      adapter_key, status, created_at, updated_at, sent_at
                    ) VALUES (
                      ?1, ?2, ?3, ?4, ?5, 'waitlist_promoted', ?6,
                      'pending', ?7, ?7, NULL
                    )`,
                  )
                  .bind(
                    promotionNotificationId,
                    tenantId,
                    registration.eventId,
                    promotion.id,
                    promotion.platformUserId,
                    notificationAdapter,
                    timestamp,
                  ),
              ]
            : []),
        ],
        audit: {
          action: "event.registration.cancel",
          resourceType: "event_registration",
          resourceReference: registrationId,
          reasonCode: promotion ? "CANCELLED_AND_PROMOTED" : "CANCELLED",
        },
      }),
    );
  }

}
