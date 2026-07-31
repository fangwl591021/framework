import type { MutationContext } from "../../application/core-services";
import { TenantBoundaryError } from "../../persistence/models";
import { EventRegistrationApplication } from "./event-registration-application";
import {
  EventEngineError,
  type CapacityReconciliationResult,
} from "./models";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class EventReconciliationApplication extends EventRegistrationApplication {
  async reconcileSessionCapacity(
    tenantId: string,
    sessionId: string,
    notificationAdapter: string,
    context: MutationContext,
  ): Promise<CapacityReconciliationResult> {
    this.validateText("notification adapter", notificationAdapter, 40);
    const fingerprint = { tenantId, sessionId, notificationAdapter };
    const replay = await this.replayEventResult<CapacityReconciliationResult>(
      tenantId,
      "event.session.capacity.reconcile",
      fingerprint,
      context,
    );
    if (replay.found) return replay.result;

    const session = await this.eventRepository.getSessionById(tenantId, sessionId);
    if (!session) throw new TenantBoundaryError();
    const hasGap =
      session.status === "scheduled"
      && session.confirmedCount < session.capacity
      && session.waitlistedCount > 0;
    const result: CapacityReconciliationResult = {
      tenantId,
      sessionId,
      reconciled: true,
    };
    if (!hasGap && !session.reconciliationRequired) return result;

    const candidate = await this.eventRepository.findEarliestWaitlisted(
      tenantId,
      sessionId,
      "",
    );
    const notificationId = candidate ? this.uuidv7.generate() : null;
    try {
      return await this.executeIdempotent(
        { scopeType: "tenant", tenantId },
        "event.session.capacity.reconcile",
        fingerprint,
        context,
        (timestamp) => ({
          result,
          statements: [
            this.db
              .prepare(
                `UPDATE event_sessions
                 SET reconciliation_required = 1,
                     version = version + 1, updated_at = ?1
                 WHERE tenant_id = ?2 AND id = ?3
                   AND status = 'scheduled'
                   AND confirmed_count < capacity
                   AND waitlisted_count > 0
                   AND reconciliation_required = 0`,
              )
              .bind(timestamp, tenantId, sessionId),
            ...(candidate
              ? [
                  this.db
                    .prepare(
                      `UPDATE event_registrations
                       SET status = 'confirmed', version = version + 1,
                           updated_at = ?1
                       WHERE tenant_id = ?2 AND id = ?3
                         AND event_session_id = ?4
                         AND status = 'waitlisted'
                         AND id = (
                           SELECT id FROM event_registrations
                           WHERE tenant_id = ?2
                             AND event_session_id = ?4
                             AND status = 'waitlisted'
                           ORDER BY registered_at, id LIMIT 1
                         )
                         AND EXISTS (
                           SELECT 1 FROM event_sessions
                           WHERE tenant_id = ?2 AND id = ?4
                             AND status = 'scheduled'
                             AND confirmed_count < capacity
                         )`,
                    )
                    .bind(timestamp, tenantId, candidate.id, sessionId),
                  this.db
                    .prepare(
                      `INSERT OR IGNORE INTO event_notifications (
                        id, tenant_id, event_id, registration_id,
                        recipient_platform_user_id, notification_type,
                        adapter_key, status, created_at, updated_at, sent_at
                      )
                      SELECT ?1, registration.tenant_id, registration.event_id,
                             registration.id, registration.platform_user_id,
                             'waitlist_promoted', ?2, 'pending', ?3, ?3, NULL
                      FROM event_registrations AS registration
                      WHERE registration.tenant_id = ?4
                        AND registration.id = ?5
                        AND registration.event_session_id = ?6
                        AND registration.status = 'confirmed'`,
                    )
                    .bind(
                      notificationId,
                      notificationAdapter,
                      timestamp,
                      tenantId,
                      candidate.id,
                      sessionId,
                    ),
                ]
              : []),
            this.db
              .prepare(
                `UPDATE event_sessions
                 SET reconciliation_required = 0,
                     version = version + 1, updated_at = ?1
                 WHERE tenant_id = ?2 AND id = ?3
                   AND reconciliation_required = 1`,
              )
              .bind(timestamp, tenantId, sessionId),
          ],
          audit: {
            action: "event.session.capacity.reconcile",
            resourceType: "event_session",
            resourceReference: sessionId,
            reasonCode: candidate ? "CAPACITY_RECONCILED" : "INTENT_CLEARED",
          },
        }),
      );
    } catch (error) {
      if (errorMessage(error).includes("event_reconciliation_incomplete")) {
        throw new EventEngineError("EVENT_RECONCILIATION_RETRY_REQUIRED");
      }
      throw error;
    }
  }
}
