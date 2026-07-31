import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { EventRegistration } from "../../src/modules/event-engine";
import {
  context,
  createLineParticipant,
  createPublishedEvent,
  harness,
  resetEventDatabase,
  setupTenant,
} from "./event-engine-helpers";

beforeEach(resetEventDatabase);

describe("Event Engine MVP flows", () => {  it("runs the complete adapter-neutral event registration and attendance flow", async () => {
    const { app, clock } = harness();
    const { tenant, ownerMembership } = await setupTenant(app, "Event Tenant");
    const draft = await app.createEvent(
      tenant.id,
      ownerMembership.id,
      {
        title: "Initial Event",
        description: "",
        registrationOpensAt: clock.current() - 10_000,
        registrationClosesAt: clock.current() + 1_000_000,
        paymentMode: "free",
      },
      context(),
    );
    const edited = await app.updateEvent(
      tenant.id,
      ownerMembership.id,
      draft.id,
      {
        title: "Edited Event",
        description: "Updated before publication",
        registrationOpensAt: draft.registrationOpensAt,
        registrationClosesAt: draft.registrationClosesAt,
        expectedVersion: 1,
      },
      context(),
    );
    expect(edited).toMatchObject({ title: "Edited Event", version: 2 });

    const firstSession = await app.addSession(
      tenant.id,
      ownerMembership.id,
      draft.id,
      {
        title: "Session A",
        startsAt: clock.current() + 2_000_000,
        endsAt: clock.current() + 2_100_000,
        capacity: 5,
        waitlistCapacity: 2,
      },
      context(),
    );
    await app.addSession(
      tenant.id,
      ownerMembership.id,
      draft.id,
      {
        title: "Session B",
        startsAt: clock.current() + 3_000_000,
        endsAt: clock.current() + 3_100_000,
        capacity: 5,
        waitlistCapacity: 2,
      },
      context(),
    );
    const nameField = await app.addFormField(
      tenant.id,
      ownerMembership.id,
      draft.id,
      {
        fieldKey: "display_name",
        label: "Display Name",
        fieldType: "text",
        required: true,
        displayOrder: 1,
      },
      context(),
    );
    await app.publishEvent(
      tenant.id,
      ownerMembership.id,
      draft.id,
      context(),
    );
    expect(await app.eventRepository.listSessions(tenant.id, draft.id)).toHaveLength(2);

    const share = await app.createShareLink(
      tenant.id,
      ownerMembership.id,
      draft.id,
      firstSession.id,
      "share-target-test",
      context(),
    );
    expect(share.payload).toEqual({
      version: 1,
      shareReference: share.link.id,
      tenantReference: tenant.id,
      eventReference: draft.id,
      sessionReference: firstSession.id,
      title: "Edited Event",
    });
    await app.recordShareTouch(
      tenant.id,
      share.link.id,
      null,
      context(),
    );

    const participant = await createLineParticipant(app, "e2e");
    const registration = await app.register(
      tenant.id,
      {
        eventId: draft.id,
        sessionId: firstSession.id,
        platformUserId: participant.id,
        sourceAdapter: "identity-channel-test",
        notificationAdapter: "notification-test",
        answers: [{ fieldId: nameField.id, value: "Tony" }],
      },
      context(),
    );
    expect(registration.status).toBe("confirmed");

    await app.updateRegistrationAnswers(
      tenant.id,
      registration.id,
      participant.id,
      [{ fieldId: nameField.id, value: "Tony Updated" }],
      context(),
    );
    const roster = await app.listRoster(
      tenant.id,
      ownerMembership.id,
      draft.id,
    );
    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({
      id: registration.id,
      paymentStatus: "not_required",
      checkedIn: false,
    });
    expect(roster[0]?.answers[0]?.value).toBe("Tony Updated");

    const qrToken = await app.issueCheckinQrToken(
      tenant.id,
      ownerMembership.id,
      registration.id,
      clock.current() + 100_000,
    );
    const checkin = await app.checkIn(
      tenant.id,
      ownerMembership.id,
      registration.id,
      "qr",
      qrToken,
      context(),
    );
    expect(checkin).toMatchObject({ method: "qr", status: "verified" });
    expect(await app.getStatistics(
      tenant.id,
      ownerMembership.id,
      draft.id,
    )).toEqual({
      eventId: draft.id,
      confirmed: 1,
      waitlisted: 0,
      cancelled: 0,
      checkedIn: 1,
      shareTouches: 1,
    });

    const audit = await app.repositories.audit.listForTenant(tenant.id);
    expect(audit.map(({ action }) => action)).toEqual(expect.arrayContaining([
      "event.create",
      "event.update",
      "event.publish",
      "event.share.create",
      "event.registration.create",
      "event.registration.answers.update",
      "event.checkin.verify",
    ]));
    expect(JSON.stringify(audit)).not.toContain("Tony Updated");
    expect(JSON.stringify(audit)).not.toContain(qrToken);
    const storedResults = await env.DB.prepare(
      `SELECT operation, stored_result_json FROM idempotency_records
       WHERE tenant_id = ?1 AND operation LIKE 'event.%'`,
    ).bind(tenant.id).all<{ operation: string; stored_result_json: string }>();
    expect(JSON.stringify(storedResults.results)).not.toContain("Tony Updated");
    expect(JSON.stringify(storedResults.results)).not.toContain(qrToken);
  });
  it("selects one capacity winner, one waitlist winner, and safely promotes on cancellation", async () => {
    const { app, clock } = harness();
    const { tenant, ownerMembership } = await setupTenant(app, "Capacity Tenant");
    const { event, session, nameField } = await createPublishedEvent(
      app,
      clock,
      tenant.id,
      ownerMembership.id,
      { capacity: 1, waitlistCapacity: 1 },
    );
    const users = await Promise.all([
      createLineParticipant(app, "capacity-a"),
      createLineParticipant(app, "capacity-b"),
      createLineParticipant(app, "capacity-c"),
    ]);
    const input = (index: number) => ({
      eventId: event.id,
      sessionId: session.id,
      platformUserId: users[index]!.id,
      sourceAdapter: "identity-channel-test",
      notificationAdapter: "notification-test",
      answers: [{ fieldId: nameField.id, value: `Participant ${index}` }],
    });
    const firstContext = context("registration-capacity-first");
    const first = await app.register(tenant.id, input(0), firstContext);
    expect(first.status).toBe("confirmed");
    expect(await app.register(tenant.id, input(0), firstContext)).toEqual(first);
    await expect(
      app.register(tenant.id, input(0), context()),
    ).rejects.toMatchObject({ code: "EVENT_DUPLICATE_REGISTRATION" });
    await expect(
      app.register(
        tenant.id,
        { ...input(0), answers: [{ fieldId: nameField.id, value: "Changed" }] },
        firstContext,
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });

    const competitors = await Promise.allSettled([
      app.register(tenant.id, input(1), context("capacity-b")),
      app.register(tenant.id, input(2), context("capacity-c")),
    ]);
    const fulfilled = competitors.filter(
      (result): result is PromiseFulfilledResult<EventRegistration> =>
        result.status === "fulfilled",
    );
    const rejected = competitors.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0]?.value.status).toBe("waitlisted");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({ code: "EVENT_WAITLIST_FULL" });

    const cancelContext = context("cancel-and-promote");
    const cancelled = await app.cancelRegistration(
      tenant.id,
      first.id,
      first.platformUserId,
      "notification-test",
      cancelContext,
    );
    expect(cancelled.status).toBe("cancelled");
    expect(await app.cancelRegistration(
      tenant.id,
      first.id,
      first.platformUserId,
      "notification-test",
      cancelContext,
    )).toEqual(cancelled);
    expect(await app.eventRepository.getRegistration(
      tenant.id,
      fulfilled[0]!.value.id,
    )).toMatchObject({ status: "confirmed" });
    expect(await app.eventRepository.getSession(
      tenant.id,
      event.id,
      session.id,
    )).toMatchObject({ confirmedCount: 1, waitlistedCount: 0 });
  });
  it("supports status-only payment and terminal event cancellation without provider calls", async () => {
    const { app, clock } = harness();
    const { tenant, ownerMembership } = await setupTenant(app, "Payment Tenant");
    const { event, session, nameField } = await createPublishedEvent(
      app,
      clock,
      tenant.id,
      ownerMembership.id,
      { paymentMode: "status_only" },
    );
    const participant = await createLineParticipant(app, "payment");
    const registration = await app.register(
      tenant.id,
      {
        eventId: event.id,
        sessionId: session.id,
        platformUserId: participant.id,
        sourceAdapter: "identity-channel-test",
        notificationAdapter: "notification-test",
        answers: [{ fieldId: nameField.id, value: "Payment User" }],
      },
      context(),
    );
    expect(await app.eventRepository.getPayment(
      tenant.id,
      registration.id,
    )).toMatchObject({ status: "pending" });
    const paymentContext = context("payment-authorize");
    const authorized = await app.updatePaymentStatus(
      tenant.id,
      ownerMembership.id,
      registration.id,
      "authorized",
      1200,
      "TWD",
      paymentContext,
    );
    expect(await app.updatePaymentStatus(
      tenant.id,
      ownerMembership.id,
      registration.id,
      "authorized",
      1200,
      "TWD",
      paymentContext,
    )).toEqual(authorized);
    await app.updatePaymentStatus(
      tenant.id,
      ownerMembership.id,
      registration.id,
      "paid",
      1200,
      "TWD",
      context(),
    );

    const cancelContext = context("event-cancel");
    const cancelled = await app.cancelEvent(
      tenant.id,
      ownerMembership.id,
      event.id,
      "notification-test",
      cancelContext,
    );
    expect(await app.cancelEvent(
      tenant.id,
      ownerMembership.id,
      event.id,
      "notification-test",
      cancelContext,
    )).toEqual(cancelled);
    expect(await app.eventRepository.getRegistration(
      tenant.id,
      registration.id,
    )).toMatchObject({ status: "cancelled" });
    expect(await app.eventRepository.getPayment(
      tenant.id,
      registration.id,
    )).toMatchObject({ status: "paid" });
    const notificationCount = await env.DB.prepare(
      `SELECT count(*) AS count
       FROM event_notifications
       WHERE tenant_id = ?1 AND event_id = ?2`,
    )
      .bind(tenant.id, event.id)
      .first<{ count: number }>();
    expect(notificationCount?.count).toBe(2);
  });
});
