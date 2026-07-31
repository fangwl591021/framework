import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import {
  context,
  createLineParticipant,
  createPublishedEvent,
  harness,
  resetEventDatabase,
  setupTenant,
} from "./event-engine-helpers";

beforeEach(resetEventDatabase);

describe("Event Engine waitlist reconciliation", () => {
  it("fills a post-race gap exactly once and replays the stored result", async () => {
    const { app, clock } = harness();
    const { tenant, ownerMembership } = await setupTenant(
      app,
      "Reconciliation Tenant",
    );
    const { event, session, nameField } = await createPublishedEvent(
      app,
      clock,
      tenant.id,
      ownerMembership.id,
      { capacity: 2, waitlistCapacity: 2 },
    );
    const users = await Promise.all(
      ["a", "b", "c", "d"].map((suffix) =>
        createLineParticipant(app, `reconcile-${suffix}`),
      ),
    );
    const registrations = [];
    for (const [index, user] of users.entries()) {
      registrations.push(await app.register(
        tenant.id,
        {
          eventId: event.id,
          sessionId: session.id,
          platformUserId: user.id,
          sourceAdapter: "identity-channel-test",
          notificationAdapter: "notification-test",
          answers: [{ fieldId: nameField.id, value: `Participant ${index}` }],
        },
        context(),
      ));
    }
    expect(registrations.map(({ status }) => status)).toEqual([
      "confirmed",
      "confirmed",
      "waitlisted",
      "waitlisted",
    ]);

    const racedAt = clock.current() + 100;
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE event_registrations
         SET status = 'cancelled', cancelled_at = ?1,
             version = version + 1, updated_at = ?1
         WHERE tenant_id = ?2 AND id = ?3 AND status = 'confirmed'`,
      ).bind(racedAt, tenant.id, registrations[0]!.id),
      env.DB.prepare(
        `UPDATE event_registrations
         SET status = 'cancelled', cancelled_at = ?1,
             version = version + 1, updated_at = ?1
         WHERE tenant_id = ?2 AND id = ?3 AND status = 'confirmed'`,
      ).bind(racedAt, tenant.id, registrations[1]!.id),
      env.DB.prepare(
        `UPDATE event_registrations
         SET status = 'confirmed', version = version + 1, updated_at = ?1
         WHERE tenant_id = ?2 AND id = ?3 AND status = 'waitlisted'`,
      ).bind(racedAt, tenant.id, registrations[2]!.id),
    ]);

    expect(await app.eventRepository.getSessionById(
      tenant.id,
      session.id,
    )).toMatchObject({
      confirmedCount: 1,
      waitlistedCount: 1,
      reconciliationRequired: true,
    });
    await expect(
      env.DB.prepare(
        `UPDATE event_sessions
         SET reconciliation_required = 0
         WHERE tenant_id = ?1 AND id = ?2`,
      ).bind(tenant.id, session.id).run(),
    ).rejects.toThrow(/event_reconciliation_incomplete/);

    const reconciliationContext = context("session-capacity-reconcile");
    const first = await app.reconcileSessionCapacity(
      tenant.id,
      session.id,
      "notification-test",
      reconciliationContext,
    );
    const replay = await app.reconcileSessionCapacity(
      tenant.id,
      session.id,
      "notification-test",
      reconciliationContext,
    );
    expect(replay).toEqual(first);
    expect(first).toEqual({
      tenantId: tenant.id,
      sessionId: session.id,
      reconciled: true,
    });

    expect(await app.eventRepository.getSessionById(
      tenant.id,
      session.id,
    )).toMatchObject({
      confirmedCount: 2,
      waitlistedCount: 0,
      reconciliationRequired: false,
    });
    expect(await app.eventRepository.getRegistration(
      tenant.id,
      registrations[3]!.id,
    )).toMatchObject({ status: "confirmed" });

    const evidence = await env.DB.batch([
      env.DB.prepare(
        `SELECT count(*) AS count FROM event_registrations
         WHERE tenant_id = ?1 AND event_session_id = ?2
           AND status = 'confirmed'`,
      ).bind(tenant.id, session.id),
      env.DB.prepare(
        `SELECT count(*) AS count FROM event_notifications
         WHERE tenant_id = ?1 AND registration_id = ?2
           AND notification_type = 'waitlist_promoted'`,
      ).bind(tenant.id, registrations[3]!.id),
      env.DB.prepare(
        `SELECT count(*) AS count FROM audit_records
         WHERE tenant_id = ?1
           AND action = 'event.session.capacity.reconcile'
           AND resource_reference = ?2`,
      ).bind(tenant.id, session.id),
      env.DB.prepare(
        `SELECT count(*) AS count FROM idempotency_records
         WHERE tenant_id = ?1
           AND operation = 'event.session.capacity.reconcile'
           AND status = 'completed'`,
      ).bind(tenant.id),
    ]);
    expect(evidence.map((result) =>
      (result.results[0] as { count: number }).count,
    )).toEqual([2, 1, 1, 1]);
  });
});
