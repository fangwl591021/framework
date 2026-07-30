import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { EventEngineError } from "../../src/modules/event-engine";
import {
  context,
  createLineParticipant,
  createPublishedEvent,
  harness,
  resetEventDatabase,
  setupTenant,
} from "./event-engine-helpers";

beforeEach(resetEventDatabase);

describe("Event Engine security and boundaries", () => {  it("enforces Event permissions and Tenant isolation without changing Core authorization", async () => {
    const { app, clock } = harness();
    const tenantA = await setupTenant(app, "Tenant A");
    const tenantB = await setupTenant(app, "Tenant B");
    const { event } = await createPublishedEvent(
      app,
      clock,
      tenantB.tenant.id,
      tenantB.ownerMembership.id,
    );

    await expect(
      app.createEvent(
        tenantB.tenant.id,
        tenantA.ownerMembership.id,
        {
          title: "Cross Tenant",
          registrationOpensAt: clock.current(),
          registrationClosesAt: clock.current() + 1000,
          paymentMode: "free",
        },
        context(),
      ),
    ).rejects.toMatchObject({ code: "EVENT_PERMISSION_DENIED" });
    await expect(
      app.createEvent(
        tenantB.tenant.id,
        tenantB.memberMembership.id,
        {
          title: "Member Cannot Manage",
          registrationOpensAt: clock.current(),
          registrationClosesAt: clock.current() + 1000,
          paymentMode: "free",
        },
        context(),
      ),
    ).rejects.toMatchObject({ code: "EVENT_PERMISSION_DENIED" });
    await expect(
      app.listRoster(
        tenantB.tenant.id,
        tenantB.memberMembership.id,
        event.id,
      ),
    ).rejects.toMatchObject({ code: "EVENT_PERMISSION_DENIED" });
    expect(await app.eventRepository.getEvent(tenantA.tenant.id, event.id)).toBeNull();

    await expect(
      env.DB.prepare(
        `INSERT INTO event_sessions (
          id, tenant_id, event_id, title, starts_at, ends_at,
          capacity, waitlist_capacity, confirmed_count, waitlisted_count,
          status, version, created_at, updated_at
        ) VALUES (
          '01990000-0000-7000-8000-000000099991', ?1, ?2,
          'Cross Tenant', 1, 2, 1, 0, 0, 0, 'scheduled', 1, 1, 1
        )`,
      ).bind(tenantA.tenant.id, event.id).run(),
    ).rejects.toThrow();
  });
  it("rejects invalid answers before persistence", async () => {
    const { app, clock } = harness();
    const { tenant, ownerMembership } = await setupTenant(app, "Form Tenant");
    const { event, session } = await createPublishedEvent(
      app,
      clock,
      tenant.id,
      ownerMembership.id,
    );
    const participant = await createLineParticipant(app, "invalid-answer");
    await expect(
      app.register(
        tenant.id,
        {
          eventId: event.id,
          sessionId: session.id,
          platformUserId: participant.id,
          sourceAdapter: "identity-channel-test",
          notificationAdapter: "notification-test",
          answers: [],
        },
        context(),
      ),
    ).rejects.toBeInstanceOf(EventEngineError);
    expect(await app.eventRepository.findActiveRegistration(
      tenant.id,
      session.id,
      participant.id,
    )).toBeNull();
  });
  it("verifies manual and tamper-resistant QR check-ins without storing raw tokens", async () => {
    const { app, clock, qr } = harness();
    const { tenant, ownerMembership } = await setupTenant(app, "Checkin Tenant");
    const { event, session, nameField } = await createPublishedEvent(
      app,
      clock,
      tenant.id,
      ownerMembership.id,
      { capacity: 2 },
    );
    const users = await Promise.all([
      createLineParticipant(app, "checkin-manual"),
      createLineParticipant(app, "checkin-qr"),
    ]);
    const registrations = await Promise.all(
      users.map((user, index) =>
        app.register(
          tenant.id,
          {
            eventId: event.id,
            sessionId: session.id,
            platformUserId: user.id,
            sourceAdapter: "identity-channel-test",
            notificationAdapter: "notification-test",
            answers: [{ fieldId: nameField.id, value: `Checkin ${index}` }],
          },
          context(),
        ),
      ),
    );
    expect(await app.checkIn(
      tenant.id,
      ownerMembership.id,
      registrations[0]!.id,
      "manual",
      null,
      context(),
    )).toMatchObject({ method: "manual" });

    const expiresAt = clock.current() + 100_000;
    const token = await app.issueCheckinQrToken(
      tenant.id,
      ownerMembership.id,
      registrations[1]!.id,
      expiresAt,
    );
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    await expect(
      app.checkIn(
        tenant.id,
        ownerMembership.id,
        registrations[1]!.id,
        "qr",
        tampered,
        context(),
      ),
    ).rejects.toMatchObject({ code: "EVENT_QR_INVALID" });

    const checkinContext = context("qr-checkin-replay");
    const verified = await app.checkIn(
      tenant.id,
      ownerMembership.id,
      registrations[1]!.id,
      "qr",
      token,
      checkinContext,
    );
    expect(await app.checkIn(
      tenant.id,
      ownerMembership.id,
      registrations[1]!.id,
      "qr",
      token,
      checkinContext,
    )).toEqual(verified);
    await expect(
      app.checkIn(
        tenant.id,
        ownerMembership.id,
        registrations[1]!.id,
        "qr",
        token,
        context(),
      ),
    ).rejects.toMatchObject({ code: "EVENT_DUPLICATE_CHECKIN" });
    await expect(qr.verify(token, expiresAt + 1)).rejects.toMatchObject({
      code: "EVENT_QR_EXPIRED",
    });

    const stored = await env.DB.prepare(
      `SELECT token_digest FROM event_checkins
       WHERE tenant_id = ?1 AND registration_id = ?2`,
    ).bind(tenant.id, registrations[1]!.id).first<{ token_digest: string }>();
    expect(stored?.token_digest).toMatch(/^[0-9a-f]{64}$/u);
    expect(stored?.token_digest).not.toContain(token);
  });
  it("uses bounded Event indexes and has no schema-level Tenant violations", async () => {
    const eventTables = await env.DB.prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND (
         name = 'events' OR name LIKE 'event_%'
       ) ORDER BY name`,
    ).all<{ name: string }>();
    expect(eventTables.results.map(({ name }) => name)).toEqual([
      "event_checkins",
      "event_form_fields",
      "event_notifications",
      "event_payments",
      "event_registration_answers",
      "event_registrations",
      "event_sessions",
      "event_share_links",
      "event_share_touches",
      "events",
    ]);
    expect((await env.DB.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);

    const plans = await Promise.all([
      env.DB.prepare(
        `EXPLAIN QUERY PLAN
         SELECT id FROM event_registrations
         WHERE tenant_id = ?1 AND event_id = ?2 AND event_session_id = ?3
           AND status = ?4 ORDER BY registered_at, id LIMIT 100`,
      ).bind("tenant", "event", "session", "confirmed").all<{ detail: string }>(),
      env.DB.prepare(
        `EXPLAIN QUERY PLAN
         SELECT id FROM event_checkins
         WHERE tenant_id = ?1 AND event_id = ?2 AND event_session_id = ?3
           AND status = 'verified' ORDER BY checked_in_at, id LIMIT 100`,
      ).bind("tenant", "event", "session").all<{ detail: string }>(),
      env.DB.prepare(
        `EXPLAIN QUERY PLAN
         SELECT id FROM event_notifications
         WHERE tenant_id = ?1 AND status = 'pending'
         ORDER BY created_at, id LIMIT 100`,
      ).bind("tenant").all<{ detail: string }>(),
    ]);
    const details = plans
      .flatMap((plan) => plan.results.map(({ detail }) => detail))
      .join("\n");
    expect(details).toContain("idx_event_registrations_roster");
    expect(details).toContain("idx_event_checkins_session_time");
    expect(details).toContain("idx_event_notifications_pending");
  });
});
