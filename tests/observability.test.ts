import { describe, expect, it } from "vitest";
import type { Clock } from "../src/core/clock";
import type { UuidV7 } from "../src/core/uuidv7";
import {
  AlertCoordinator,
  DeterministicAlertTemplate,
  DisabledAiRootCauseAdapter,
  DisabledTelegramAdapter,
  DependencyRegistry,
  DependencyStatusAggregator,
  FailureClassifier,
  LocalAlertRetryAdapter,
  LocalAlertFailureEvidenceAdapter,
  LocalObservabilityFailureEvidenceAdapter,
  ObservabilitySidecar,
  ObservationRetentionEligibility,
  LocalCaptureAlertAdapter,
  OperationStatusBuilder,
  StaticAlertPolicy,
  StaticDependencyProbe,
  SupportCodeCodec,
  TelegramConfigurationGuard,
  type AlertDeliveryRecord,
  type AlertHistoryPort,
  type Incident,
  type ObservationEvent,
} from "../src/platform-observability";

class MutableClock implements Clock {
  constructor(private value = Date.parse("2026-08-03T00:00:00Z")) {}
  now(): Date { return new Date(this.value); }
  advance(ms: number): void { this.value += ms; }
}

class TestUuid implements UuidV7 {
  private value = 0;
  generate(): string {
    this.value += 1;
    return `019b0000-0000-7000-8000-${this.value.toString().padStart(12, "0")}`;
  }
}

class MemoryAlertHistory implements AlertHistoryPort {
  constructor(private readonly failSave = false) {}
  readonly records: AlertDeliveryRecord[] = [];
  async latestForIncident(incidentId: string) {
    return [...this.records].reverse().find((record) => record.incidentId === incidentId) ?? null;
  }
  async findByDeliveryKey(deliveryKey: string) {
    return this.records.find((record) => record.deliveryKey === deliveryKey) ?? null;
  }
  async save(record: AlertDeliveryRecord, safePayloadJson: string): Promise<void> {
    expect(safePayloadJson).not.toMatch(/token|secret|stack|select\s/i);
    if (this.failSave) throw new Error("ALERT_HISTORY_UNAVAILABLE");
    this.records.push(record);
  }
}

function event(severity: ObservationEvent["severity"] = "error"): ObservationEvent {
  return {
    eventId: "019b0000-0000-7000-8000-000000000001",
    correlationId: "correlation-001",
    traceId: "trace-id-001",
    timestamp: 1,
    environment: "development",
    releaseId: "release-local",
    tenantId: "019b0000-0000-7000-8000-000000000010",
    applicationId: null,
    moduleKey: "core",
    operation: "GET /test",
    eventType: "request.failed",
    severity,
    status: "failed",
    reasonCode: "PLATFORM_INTERNAL_ERROR",
    safeMessage: "The service could not complete the request.",
    dependencyKey: null,
    actorReferenceDigest: null,
    occurrenceCount: 1,
    firstSeenAt: 1,
    lastSeenAt: 1,
    metadataSafeJson: "{}",
    retentionExpiresAt: 10_000,
    retentionStatus: "active",
    anonymizedAt: null,
  };
}

function incident(severity: Incident["severity"] = "error", count = 3): Incident {
  return {
    incidentId: "019b0000-0000-7000-8000-000000000002",
    scopeType: "tenant",
    tenantId: "019b0000-0000-7000-8000-000000000010",
    aggregationScopeKey: "tenant:019b0000-0000-7000-8000-000000000010",
    fingerprint: "a".repeat(64),
    title: "Diagnostic incident: PLATFORM_INTERNAL_ERROR",
    severity,
    status: "open",
    firstSeenAt: 1,
    lastSeenAt: 1,
    occurrenceCount: count,
    affectedTenantCount: 1,
    affectedApplicationCount: 0,
    dependencyKey: null,
    releaseId: "release-local",
    ownerReference: null,
    resolutionCode: null,
    resolvedAt: null,
    reopenCount: 0,
  };
}

function coordinator(options: { severity?: "warning" | "error" | "critical"; threshold?: number; delivery?: LocalCaptureAlertAdapter | DisabledTelegramAdapter; history?: MemoryAlertHistory } = {}) {
  const clock = new MutableClock();
  const history = options.history ?? new MemoryAlertHistory();
  const retry = new LocalAlertRetryAdapter();
  const delivery = options.delivery ?? new LocalCaptureAlertAdapter();
  const policy = new StaticAlertPolicy({
    policyId: null,
    minimumSeverity: options.severity ?? "error",
    eventCategory: null,
    environment: null,
    moduleKey: null,
    tenantId: null,
    dependencyKey: null,
    aggregationWindowMs: 60_000,
    occurrenceThreshold: options.threshold ?? 2,
    cooldownMs: 300_000,
    escalationDelayMs: 5_000,
    enabled: true,
  });
  return {
    service: new AlertCoordinator(clock, new TestUuid(), policy, delivery,
      new DeterministicAlertTemplate(), history, retry,
      new LocalAlertFailureEvidenceAdapter()),
    clock, history, retry, delivery,
  };
}

describe("Deterministic failure classification", () => {
  const classifier = new FailureClassifier();
  const base = { operation: "save", environment: "development" as const };
  it("classifies incomplete input as actionable", () => {
    expect(classifier.classify({ ...base, errorCode: "INPUT_INCOMPLETE" }))
      .toMatchObject({ category: "USER_INPUT_INCOMPLETE", actionRequired: true, retryable: false });
  });
  it("classifies permission denial without retry", () => {
    expect(classifier.classify({ ...base, errorCode: "PERMISSION_DENIED" }))
      .toMatchObject({ category: "PERMISSION_DENIED", actionRequired: true, retryable: false });
  });
  it("classifies disabled modules", () => {
    expect(classifier.classify({ ...base, errorCode: "MODULE_NOT_ENABLED" }).category)
      .toBe("MODULE_NOT_ENABLED");
  });
  it("lets dependency evidence override an unknown error", () => {
    expect(classifier.classify({ ...base, errorCode: "UNMAPPED", dependencyStatus: "unavailable" }))
      .toMatchObject({ category: "EXTERNAL_PROVIDER_UNAVAILABLE", retryable: true });
  });
  it("classifies release health deterministically", () => {
    expect(classifier.classify({ ...base, errorCode: "UNMAPPED", releaseHealthy: false }).category)
      .toBe("RELEASE_HEALTH_FAILED");
  });
  it("keeps AI root-cause analysis disabled", async () => {
    await expect(new DisabledAiRootCauseAdapter().analyze(
      classifier.classify({ ...base, errorCode: "INTERNAL_ERROR" }), {},
    )).rejects.toThrow("AI_ROOT_CAUSE_PROVIDER_DISABLED");
  });
});

describe("Three-level safe status", () => {
  const builder = new OperationStatusBuilder();
  it("returns explicit processing communication", () => {
    expect(builder.user("processing")).toMatchObject({ status: "processing", retryable: false });
    expect(builder.user("processing").message).toContain("Do not submit");
  });
  it("returns actionable incomplete-input communication", () => {
    expect(builder.user("action_required", { message: "Provide the missing address information." }))
      .toMatchObject({ actionRequired: true, retryable: false });
  });
  it("rejects stack, SQL, and secret detail", () => {
    expect(() => builder.user("failed", { message: "stack SELECT secret" })).toThrow();
  });
  it("keeps tenant diagnostics digested", () => {
    const classified = new FailureClassifier().classify({
      errorCode: "INVALID_REQUEST", operation: "save", environment: "development",
    });
    expect(builder.tenant({ ...event("warning"), actorReferenceDigest: `digest:${"a".repeat(64)}` }, classified, "SUP-0123456789"))
      .toMatchObject({ tenantId: event().tenantId, reasonCategory: "USER_INPUT_INVALID" });
  });
});

describe("Dependency health", () => {
  it("fails readiness when a required dependency is unavailable", async () => {
    const registry = new DependencyRegistry(); registry.register({ dependencyKey: "d1", required: true });
    const snapshot = await new DependencyStatusAggregator(new MutableClock(), registry,
      [new StaticDependencyProbe("d1", "unavailable", "D1_UNAVAILABLE")]).snapshot();
    expect(snapshot.ready).toBe(false);
  });
  it("keeps readiness when an optional dependency is degraded", async () => {
    const registry = new DependencyRegistry(); registry.register({ dependencyKey: "telegram", required: false });
    const snapshot = await new DependencyStatusAggregator(new MutableClock(), registry,
      [new StaticDependencyProbe("telegram", "degraded", "PROVIDER_DEGRADED")]).snapshot();
    expect(snapshot).toMatchObject({ ready: true, optionalDegradedCount: 1 });
  });
  it("fails closed when a required probe is missing", async () => {
    const registry = new DependencyRegistry(); registry.register({ dependencyKey: "database", required: true });
    expect((await new DependencyStatusAggregator(new MutableClock(), registry, []).snapshot()).ready).toBe(false);
  });
});

describe("Provider-neutral alerting", () => {
  it("does not alert below the severity threshold", async () => {
    const harness = coordinator({ severity: "critical" });
    expect(await harness.service.evaluate(event("error"), incident("error"), "SUP-0123456789")).toBeNull();
  });
  it("requires repeated errors before delivery", async () => {
    const harness = coordinator({ threshold: 3 });
    expect(await harness.service.evaluate(event("error"), incident("error", 2), "SUP-0123456789")).toBeNull();
  });
  it("delivers critical alerts immediately", async () => {
    const harness = coordinator({ threshold: 99 });
    const result = await harness.service.evaluate(event("critical"), incident("critical", 1), "SUP-0123456789");
    expect(result?.status).toBe("delivered");
  });
  it("suppresses a duplicate incident inside cooldown", async () => {
    const harness = coordinator();
    await harness.service.evaluate(event(), incident(), "SUP-0123456789");
    harness.clock.advance(61_000);
    const result = await harness.service.evaluate(event(), incident("error", 4), "SUP-0123456789");
    expect(result?.status).toBe("suppressed");
  });
  it("lets severity escalation bypass cooldown", async () => {
    const harness = coordinator();
    await harness.service.evaluate(event(), incident(), "SUP-0123456789");
    harness.clock.advance(61_000);
    const result = await harness.service.evaluate(event("critical"), incident("critical", 4), "SUP-0123456789");
    expect(result?.status).toBe("delivered");
  });
  it("isolates disabled Telegram delivery and schedules one retry", async () => {
    const harness = coordinator({ delivery: new DisabledTelegramAdapter() });
    const first = await harness.service.evaluate(event(), incident(), "SUP-0123456789");
    const replay = await harness.service.evaluate(event(), incident(), "SUP-0123456789");
    expect(first?.status).toBe("retry_scheduled");
    expect(replay?.deliveryId).toBe(first?.deliveryId);
    expect(harness.retry.scheduled.size).toBe(1);
  });
});

describe("Trusted Telegram configuration", () => {
  const valid = {
    telegramBotTokenSecretReference: "secret:TELEGRAM_BOT_TOKEN",
    telegramChatIdReference: "env:TELEGRAM_CHAT_ID",
    enabled: false,
    minimumSeverity: "error" as const,
    environmentAllowlist: ["development"] as const,
  };
  it("accepts trusted reference-only development configuration", () => {
    expect(new TelegramConfigurationGuard().validate(valid, {
      source: "trusted_environment_configuration", environment: "development",
    }).enabled).toBe(false);
  });
  it("fails closed without a token Secret reference", () => {
    const { telegramBotTokenSecretReference: _removed, ...missing } = valid;
    expect(() => new TelegramConfigurationGuard().validate(missing, {
      source: "trusted_environment_configuration", environment: "development",
    })).toThrow("INVALID_TELEGRAM_CONFIGURATION");
  });
  it("fails closed without a trusted Chat ID reference", () => {
    expect(() => new TelegramConfigurationGuard().validate({ ...valid, telegramChatIdReference: "not-a-reference" }, {
      source: "trusted_environment_configuration", environment: "development",
    })).toThrow("INVALID_TELEGRAM_CONFIGURATION");
  });
  it("never accepts a production target not in the allowlist", () => {
    expect(() => new TelegramConfigurationGuard().validate({ ...valid, enabled: true }, {
      source: "trusted_environment_configuration", environment: "production",
    })).toThrow("INVALID_TELEGRAM_CONFIGURATION");
  });
  it("creates a short collision-resistant support-code shape", async () => {
    const codec = new SupportCodeCodec();
    const first = await codec.generate("correlation-001", "event-001");
    const second = await codec.generate("correlation-001", "event-002");
    expect(first).toMatch(/^SUP-[0-9A-F]{10}$/);
    expect(second).not.toBe(first);
  });
});
describe("Observability failure isolation", () => {
  it("preserves a successful business result and never repeats its mutation", async () => {
    const fallback = new LocalObservabilityFailureEvidenceAdapter();
    const sidecar = new ObservabilitySidecar(new MutableClock(), fallback);
    let businessMutationCount = 0;
    businessMutationCount += 1;
    const result = await sidecar.afterSuccessfulOperation(
      { status: "completed", businessMutationCount },
      {
        correlationId: "safe-correlation-001",
        operation: "business.complete",
        observe: async () => { throw new Error("repository unavailable with sensitive detail"); },
      },
    );
    expect(result).toEqual({ status: "completed", businessMutationCount: 1 });
    expect(businessMutationCount).toBe(1);
    expect(fallback.evidence).toHaveLength(1);
    expect(JSON.stringify(fallback.evidence)).not.toMatch(/sensitive|request.?body|secret|stack|select\s/i);
  });

  it("deduplicates a delivered alert when primary history persistence fails", async () => {
    const delivery = new LocalCaptureAlertAdapter();
    const harness = coordinator({ delivery, history: new MemoryAlertHistory(true) });
    const first = await harness.service.evaluate(event(), incident(), "SUP-0123456789");
    const replay = await harness.service.evaluate(event(), incident(), "SUP-0123456789");
    expect(first?.status).toBe("delivered");
    expect(replay?.deliveryId).toBe(first?.deliveryId);
    expect(delivery.deliveries).toHaveLength(1);
  });
});

describe("Deterministic observation retention eligibility", () => {
  const eligibility = new ObservationRetentionEligibility();
  it("does not select an active observation before expiry", () => {
    expect(eligibility.isEligible(event(), 9_999)).toBe(false);
  });
  it("selects an active observation at or after expiry", () => {
    expect(eligibility.isEligible(event(), 10_000)).toBe(true);
  });
  it("requires a governed, bounded executor scope", () => {
    expect(() => eligibility.assertExecutionScope({
      source: "governed_retention_executor",
      scopeType: "tenant",
      tenantId: null,
      limit: 10,
    })).toThrow("INVALID_RETENTION_EXECUTION_SCOPE");
    expect(() => eligibility.assertExecutionScope({
      source: "governed_retention_executor",
      scopeType: "platform",
      tenantId: null,
      limit: 101,
    })).toThrow("INVALID_RETENTION_EXECUTION_SCOPE");
  });
});