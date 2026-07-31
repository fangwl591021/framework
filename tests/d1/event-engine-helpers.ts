import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { expect } from "vitest";
import type { MutationContext } from "../../src/application/core-services";
import type { Clock } from "../../src/core/clock";
import type { UuidV7 } from "../../src/core/uuidv7";
import {
  EventEngineApplication,
  EventEngineError,
  HmacEventQrTokenService,
  type EventRegistration,
  type EventQrKeyProvider,
} from "../../src/modules/event-engine";
import type { IdentityDigestKeyProvider } from "../../src/persistence/crypto";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
const encoder = new TextEncoder();

class TestClock implements Clock {
  private value = Date.parse("2026-08-01T00:00:00.000Z");

  now(): Date {
    this.value += 1;
    return new Date(this.value);
  }

  current(): number {
    return this.value;
  }
}

class TestUuidV7 implements UuidV7 {
  private value = 20_000;

  generate(): string {
    this.value += 1;
    return `01990000-0000-7000-8000-${this.value.toString().padStart(12, "0")}`;
  }
}

class TestIdentityKeys implements IdentityDigestKeyProvider {
  current() {
    return {
      version: 1,
      secret: encoder.encode("event-identity-test-key-32-bytes-minimum"),
    };
  }

  previous() {
    return [];
  }
}

class TestQrKeys implements EventQrKeyProvider {
  private readonly key = {
    version: 1,
    secret: encoder.encode("event-qr-test-key-is-at-least-32-bytes"),
  };

  current() {
    return this.key;
  }

  resolve(version: number) {
    return version === this.key.version ? this.key : null;
  }
}

let contextSequence = 0;

export function context(
  idempotencyKey?: string,
  actorReference = "local-event-test",
): MutationContext {
  contextSequence += 1;
  return {
    idempotencyKey: idempotencyKey ?? `event-idem-${contextSequence}`,
    actorType: "platform_user",
    actorReference,
    correlationId: `event-corr-${contextSequence}`,
  };
}

export function harness() {
  const clock = new TestClock();
  const uuid = new TestUuidV7();
  const qr = new HmacEventQrTokenService(new TestQrKeys(), clock);
  const app = new EventEngineApplication(
    env.DB,
    clock,
    uuid,
    new TestIdentityKeys(),
    qr,
  );
  return { app, clock, qr };
}

export async function setupTenant(
  app: EventEngineApplication,
  name: string,
) {
  const ownerUser = await app.createPlatformUser(context());
  const tenant = await app.createTenant(name, context());
  const ownerMembership = await app.addTenantMembership(
    tenant.id,
    ownerUser.id,
    "event-bootstrap",
    context(),
  );
  await app.assignRole(
    tenant.id,
    ownerMembership.id,
    "tenant_owner",
    context(),
  );
  const memberUser = await app.createPlatformUser(context());
  const memberMembership = await app.addTenantMembership(
    tenant.id,
    memberUser.id,
    "event-member",
    context(),
  );
  await app.assignRole(
    tenant.id,
    memberMembership.id,
    "tenant_member",
    context(),
  );
  return {
    tenant,
    ownerUser,
    ownerMembership,
    memberUser,
    memberMembership,
  };
}

export async function createPublishedEvent(
  app: EventEngineApplication,
  clock: TestClock,
  tenantId: string,
  ownerMembershipId: string,
  options: {
    readonly capacity?: number;
    readonly waitlistCapacity?: number;
    readonly paymentMode?: "free" | "status_only";
    readonly secondSession?: boolean;
  } = {},
) {
  const event = await app.createEvent(
    tenantId,
    ownerMembershipId,
    {
      title: "Platform Core Community Day",
      description: "Adapter-neutral Event Engine integration",
      registrationOpensAt: clock.current() - 10_000,
      registrationClosesAt: clock.current() + 1_000_000,
      paymentMode: options.paymentMode ?? "free",
    },
    context(),
  );
  const session = await app.addSession(
    tenantId,
    ownerMembershipId,
    event.id,
    {
      title: "Morning Session",
      startsAt: clock.current() + 2_000_000,
      endsAt: clock.current() + 2_100_000,
      capacity: options.capacity ?? 10,
      waitlistCapacity: options.waitlistCapacity ?? 5,
    },
    context(),
  );
  if (options.secondSession) {
    await app.addSession(
      tenantId,
      ownerMembershipId,
      event.id,
      {
        title: "Afternoon Session",
        startsAt: clock.current() + 3_000_000,
        endsAt: clock.current() + 3_100_000,
        capacity: 10,
        waitlistCapacity: 5,
      },
      context(),
    );
  }
  const nameField = await app.addFormField(
    tenantId,
    ownerMembershipId,
    event.id,
    {
      fieldKey: "display_name",
      label: "Display Name",
      fieldType: "text",
      required: true,
      displayOrder: 1,
    },
    context(),
  );
  const mealField = await app.addFormField(
    tenantId,
    ownerMembershipId,
    event.id,
    {
      fieldKey: "meal",
      label: "Meal",
      fieldType: "choice",
      required: false,
      options: ["standard", "vegetarian"],
      displayOrder: 2,
    },
    context(),
  );
  await app.publishEvent(
    tenantId,
    ownerMembershipId,
    event.id,
    context(),
  );
  return { event, session, nameField, mealField };
}

export async function createLineParticipant(app: EventEngineApplication, suffix: string) {
  const user = await app.createPlatformUser(context());
  await app.linkExternalIdentity(
    user.id,
    "line",
    "test-channel",
    `line-subject-${suffix}`,
    context(),
  );
  const resolved = await app.resolveExternalIdentity(
    "line",
    "test-channel",
    `line-subject-${suffix}`,
  );
  expect(resolved?.id).toBe(user.id);
  return user;
}

export async function resetEventDatabase(): Promise<void> {
  contextSequence = 0;
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
}
