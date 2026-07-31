import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import type { MutationContext } from "../../src/application/core-services";
import type { Clock } from "../../src/core/clock";
import type { UuidV7 } from "../../src/core/uuidv7";
import {
  PlatformObservabilityApplication,
  type IncidentAggregationGuardPort,
  type ObservabilityFailureEvidencePort,
} from "../../src/platform-observability";
import type { IdentityDigestKeyProvider } from "../../src/persistence/crypto";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
const encoder = new TextEncoder();

export const tenantA = "019c0000-0000-7000-8000-000000000001";
export const tenantB = "019c0000-0000-7000-8000-000000000002";
export const actorDigest = `digest:${"a".repeat(64)}`;

export class ObservabilityClock implements Clock {
  private value = Date.parse("2026-09-01T00:00:00.000Z");
  now(): Date { this.value += 1; return new Date(this.value); }
  advance(ms: number): void { this.value += ms; }
  current(): number { return this.value; }
}

class ObservabilityUuid implements UuidV7 {
  private value = 60_000;
  generate(): string {
    this.value += 1;
    return `019c0000-0000-7000-8000-${this.value.toString().padStart(12, "0")}`;
  }
}

class ObservabilityKeys implements IdentityDigestKeyProvider {
  current() { return { version: 1, secret: encoder.encode("observability-local-key-32-bytes-min") }; }
  previous() { return []; }
}

let sequence = 0;
export function observationContext(key?: string): MutationContext {
  sequence += 1;
  return {
    idempotencyKey: key ?? `observation-idempotency-${sequence}`,
    actorType: "platform_user",
    actorReference: actorDigest,
    correlationId: `observation-correlation-${sequence}`,
  };
}

export async function resetObservabilityDatabase() {
  sequence = 0;
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO tenants (id, name, status, created_at, updated_at) VALUES (?1, ?2, 'active', 1, 1)").bind(tenantA, "Observability Tenant A"),
    env.DB.prepare("INSERT INTO tenants (id, name, status, created_at, updated_at) VALUES (?1, ?2, 'active', 1, 1)").bind(tenantB, "Observability Tenant B"),
  ]);
}

export function observabilityHarness(options: Readonly<{
  incidentGuard?: IncidentAggregationGuardPort;
  failureEvidence?: ObservabilityFailureEvidencePort;
}> = {}) {
  const clock = new ObservabilityClock();
  return {
    app: new PlatformObservabilityApplication(
      env.DB, clock, new ObservabilityUuid(), new ObservabilityKeys(),
      null, null, options.incidentGuard ?? null, options.failureEvidence ?? null,
    ),
    clock,
  };
}

export function observationInput(tenantId: string | null = tenantA) {
  return {
    correlationId: "runtime-correlation-001",
    traceId: "runtime-trace-001",
    environment: "development" as const,
    releaseId: "release-local-001",
    tenantId,
    applicationId: tenantId ? "application-local-001" : null,
    moduleKey: "platform-core",
    operation: "POST /internal/test",
    eventType: "request.failed" as const,
    severity: "error" as const,
    status: "failed" as const,
    errorCode: "INTERNAL_ERROR",
    safeMessage: "The service could not complete the request.",
    actorReferenceDigest: actorDigest,
    metadata: { attempt: 1, routeClass: "internal" },
  };
}