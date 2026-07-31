import type { UuidV7 } from "../core/uuidv7";
import { TrafficProtectionError } from "./errors";
import type {
  AcceptedOperationReceipt,
  AdmissionSheddingDecision,
  CircuitBreakerDecision,
  CircuitBreakerPolicy,
  CircuitBreakerState,
  DegradationMode,
  LoadSheddingPolicy,
  RateLimitDecision,
  RateLimitPolicy,
  ResourceIsolationDecision,
  TenantAdmissionBudget,
  TenantResourceUsageSnapshot,
  TrafficObservation,
  TrustedAdmissionContext,
  WebhookEventFingerprint,
  WebhookReceiptRecord,
  WebhookReplayResult,
} from "./models";
import type {
  CircuitBreakerPort,
  LoadSheddingPort,
  RateLimiterPort,
  TenantResourceIsolationPort,
  TrafficObservationPort,
  TrafficReadinessPort,
  WebhookDeduplicationPort,
} from "./ports";

const MAX_COUNTER = 1_000_000_000;

function boundedIncrement(value: number): number {
  return Math.min(MAX_COUNTER, value + 1);
}

function assertDigest(value: string | null, name: string): void {
  if (value !== null && !/^digest:[0-9a-f]{64}$/.test(value)) {
    throw new TypeError(`${name} must be a trusted digest`);
  }
}

function assertTrustedContext(context: TrustedAdmissionContext): void {
  if (context.source !== "trusted_runtime_context") {
    throw new TypeError("UNTRUSTED_ADMISSION_CONTEXT");
  }
  if (!context.tenantId || !context.moduleKey || !context.routeKey) {
    throw new TypeError("INVALID_ADMISSION_CONTEXT");
  }
  assertDigest(context.actorDigest, "actorDigest");
  assertDigest(context.ipDigest, "ipDigest");
}

function rateKey(context: TrustedAdmissionContext): string {
  assertTrustedContext(context);
  return [
    context.environment,
    context.tenantId,
    context.applicationId ?? "tenant",
    context.moduleKey,
    context.routeKey,
    context.actorDigest ?? "anonymous",
    context.ipDigest ?? "no-ip",
  ].join("|");
}

interface WindowCounter {
  startedAt: number;
  count: number;
  blockedUntil: number;
}

export class LocalSlidingWindowRateLimiter implements RateLimiterPort {
  private readonly counters = new Map<string, WindowCounter>();

  constructor(
    private readonly now: () => number,
    private readonly policy: RateLimitPolicy,
  ) {
    if (
      !Number.isInteger(policy.limit) || policy.limit < 1 || policy.limit > 1_000_000
      || !Number.isInteger(policy.burst) || policy.burst < 0 || policy.burst > policy.limit
      || policy.windowMs < 100 || policy.windowMs > 86_400_000
      || policy.cooldownMs < 0 || policy.cooldownMs > 604_800_000
    ) {
      throw new TypeError("INVALID_RATE_LIMIT_POLICY");
    }
  }

  async evaluate(context: TrustedAdmissionContext): Promise<RateLimitDecision> {
    const key = rateKey(context);
    const timestamp = this.now();
    const prior = this.counters.get(key);
    const current = !prior || timestamp - prior.startedAt >= this.policy.windowMs
      ? { startedAt: timestamp, count: 0, blockedUntil: 0 }
      : prior;
    const capacity = this.policy.limit + this.policy.burst;
    if (timestamp < current.blockedUntil || current.count >= capacity) {
      current.blockedUntil = Math.max(
        current.blockedUntil,
        current.startedAt + this.policy.windowMs + this.policy.cooldownMs,
      );
      this.counters.set(key, current);
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.blockedUntil - timestamp) / 1000),
      );
      return Object.freeze({
        admitted: this.policy.enforcementMode === "observe",
        observedOnly: this.policy.enforcementMode === "observe",
        retryAfterSeconds,
        reasonCode: "RATE_LIMITED",
      });
    }
    current.count = boundedIncrement(current.count);
    this.counters.set(key, current);
    return Object.freeze({
      admitted: true,
      observedOnly: false,
      retryAfterSeconds: null,
      reasonCode: "RATE_LIMIT_OK",
    });
  }
}

export class LocalHierarchicalRateLimiter implements RateLimiterPort {
  private readonly tenantLimiter: LocalSlidingWindowRateLimiter;
  private readonly platformLimiter: LocalSlidingWindowRateLimiter;

  constructor(
    now: () => number,
    tenantPolicy: RateLimitPolicy,
    platformPolicy: RateLimitPolicy,
  ) {
    this.tenantLimiter = new LocalSlidingWindowRateLimiter(now, tenantPolicy);
    this.platformLimiter = new LocalSlidingWindowRateLimiter(now, platformPolicy);
  }

  async evaluate(context: TrustedAdmissionContext): Promise<RateLimitDecision> {
    const tenant = await this.tenantLimiter.evaluate(context);
    if (!tenant.admitted) {
      return Object.freeze({ ...tenant, reasonCode: "TENANT_RATE_LIMITED" as const });
    }
    const platform = await this.platformLimiter.evaluate(Object.freeze({
      ...context,
      tenantId: "trusted-platform-rate-scope",
      applicationId: null,
      actorDigest: null,
      ipDigest: null,
    }));
    if (!platform.admitted) {
      return Object.freeze({ ...platform, reasonCode: "PLATFORM_RATE_LIMITED" as const });
    }
    return tenant;
  }
}
interface ResourceWindow extends TenantResourceUsageSnapshot {
  startedAt: number;
}

const EMPTY_USAGE: TenantResourceUsageSnapshot = Object.freeze({
  concurrentRequests: 0,
  requestsPerWindow: 0,
  expensiveMutationsPerWindow: 0,
  backgroundIntentsPerWindow: 0,
  providerCallsPerWindow: 0,
  databaseWritesPerWindow: 0,
});

export class LocalTenantResourceIsolation implements TenantResourceIsolationPort {
  private readonly tenantUsage = new Map<string, ResourceWindow>();
  private platformUsage: ResourceWindow = { ...EMPTY_USAGE, startedAt: 0 };

  constructor(
    private readonly now: () => number,
    private readonly budget: TenantAdmissionBudget,
  ) {}

  async evaluate(context: TrustedAdmissionContext): Promise<ResourceIsolationDecision> {
    assertTrustedContext(context);
    const timestamp = this.now();
    const tenant = this.window(
      this.tenantUsage.get(context.tenantId),
      timestamp,
      this.budget.tenant.windowMs,
    );
    this.platformUsage = this.window(
      this.platformUsage,
      timestamp,
      this.budget.platform.windowMs,
    );
    const tenantExceeded = this.exceeds(tenant, this.budget.tenant, context);
    if (tenantExceeded) {
      this.tenantUsage.set(context.tenantId, tenant);
      return Object.freeze({
        admitted: false,
        reasonCode: "TENANT_BUDGET_EXHAUSTED",
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((tenant.startedAt + this.budget.tenant.windowMs - timestamp) / 1000),
        ),
      });
    }
    const platformExceeded = this.exceeds(this.platformUsage, this.budget.platform, context);
    if (platformExceeded && context.priority !== "critical") {
      return Object.freeze({
        admitted: false,
        reasonCode: "PLATFORM_BUDGET_EXHAUSTED",
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((this.platformUsage.startedAt + this.budget.platform.windowMs - timestamp) / 1000),
        ),
      });
    }
    const nextTenant = this.increment(tenant, context);
    this.tenantUsage.set(context.tenantId, nextTenant);
    this.platformUsage = this.increment(this.platformUsage, context);
    return Object.freeze({
      admitted: true,
      reasonCode: "RESOURCE_OK",
      retryAfterSeconds: null,
    });
  }

  snapshot(tenantId: string): TenantResourceUsageSnapshot {
    const usage = this.tenantUsage.get(tenantId) ?? { ...EMPTY_USAGE, startedAt: 0 };
    return Object.freeze({
      concurrentRequests: usage.concurrentRequests,
      requestsPerWindow: usage.requestsPerWindow,
      expensiveMutationsPerWindow: usage.expensiveMutationsPerWindow,
      backgroundIntentsPerWindow: usage.backgroundIntentsPerWindow,
      providerCallsPerWindow: usage.providerCallsPerWindow,
      databaseWritesPerWindow: usage.databaseWritesPerWindow,
    });
  }

  release(tenantId: string): void {
    const usage = this.tenantUsage.get(tenantId);
    if (usage) {
      this.tenantUsage.set(tenantId, {
        ...usage,
        concurrentRequests: Math.max(0, usage.concurrentRequests - 1),
      });
    }
    this.platformUsage = {
      ...this.platformUsage,
      concurrentRequests: Math.max(0, this.platformUsage.concurrentRequests - 1),
    };
  }

  private window(
    existing: ResourceWindow | undefined,
    timestamp: number,
    windowMs: number,
  ): ResourceWindow {
    if (!existing || timestamp - existing.startedAt >= windowMs) {
      return { ...EMPTY_USAGE, startedAt: timestamp };
    }
    return existing;
  }

  private exceeds(
    usage: ResourceWindow,
    policy: TenantAdmissionBudget["tenant"],
    context: TrustedAdmissionContext,
  ): boolean {
    return usage.concurrentRequests >= policy.concurrentRequests
      || usage.requestsPerWindow >= policy.requestsPerWindow
      || (context.operationClass === "expensive_mutation"
        && usage.expensiveMutationsPerWindow >= policy.expensiveMutationsPerWindow)
      || (context.operationClass === "background"
        && usage.backgroundIntentsPerWindow >= policy.backgroundIntentsPerWindow)
      || (context.dependencyKey !== null
        && usage.providerCallsPerWindow >= policy.providerCallsPerWindow)
      || (context.operationClass !== "query"
        && usage.databaseWritesPerWindow >= policy.databaseWritesPerWindow);
  }

  private increment(
    usage: ResourceWindow,
    context: TrustedAdmissionContext,
  ): ResourceWindow {
    return {
      ...usage,
      concurrentRequests: boundedIncrement(usage.concurrentRequests),
      requestsPerWindow: boundedIncrement(usage.requestsPerWindow),
      expensiveMutationsPerWindow: context.operationClass === "expensive_mutation"
        ? boundedIncrement(usage.expensiveMutationsPerWindow)
        : usage.expensiveMutationsPerWindow,
      backgroundIntentsPerWindow: context.operationClass === "background"
        ? boundedIncrement(usage.backgroundIntentsPerWindow)
        : usage.backgroundIntentsPerWindow,
      providerCallsPerWindow: context.dependencyKey
        ? boundedIncrement(usage.providerCallsPerWindow)
        : usage.providerCallsPerWindow,
      databaseWritesPerWindow: context.operationClass === "query"
        ? usage.databaseWritesPerWindow
        : boundedIncrement(usage.databaseWritesPerWindow),
    };
  }
}

export class LocalCircuitBreaker implements CircuitBreakerPort {
  private readonly states = new Map<string, CircuitBreakerState>();

  constructor(
    private readonly now: () => number,
    private readonly policy: CircuitBreakerPolicy,
  ) {
    if (
      policy.failureThreshold < 1 || policy.failureThreshold > 1000
      || policy.cooldownMs < 100 || policy.cooldownMs > 604_800_000
      || policy.halfOpenProbeLimit < 1 || policy.halfOpenProbeLimit > 100
    ) {
      throw new TypeError("INVALID_CIRCUIT_POLICY");
    }
  }

  async evaluate(context: TrustedAdmissionContext): Promise<CircuitBreakerDecision> {
    assertTrustedContext(context);
    if (!context.dependencyKey) {
      return Object.freeze({ admitted: true, probe: false, state: "closed", retryAfterSeconds: null });
    }
    const key = this.scopeKey(context);
    const timestamp = this.now();
    const current = this.states.get(key) ?? this.closed(key);
    if (current.state === "open") {
      if ((current.cooldownUntil as number) > timestamp) {
        return Object.freeze({
          admitted: false,
          probe: false,
          state: "open",
          retryAfterSeconds: Math.max(1, Math.ceil(((current.cooldownUntil as number) - timestamp) / 1000)),
        });
      }
      const halfOpen: CircuitBreakerState = Object.freeze({
        ...current,
        state: "half_open",
        halfOpenProbeCount: 1,
      });
      this.states.set(key, halfOpen);
      return Object.freeze({ admitted: true, probe: true, state: "half_open", retryAfterSeconds: null });
    }
    if (current.state === "half_open") {
      const admitted = current.halfOpenProbeCount < this.policy.halfOpenProbeLimit;
      if (admitted) {
        this.states.set(key, Object.freeze({
          ...current,
          halfOpenProbeCount: boundedIncrement(current.halfOpenProbeCount),
        }));
      }
      return Object.freeze({
        admitted,
        probe: admitted,
        state: "half_open",
        retryAfterSeconds: admitted ? null : 1,
      });
    }
    return Object.freeze({ admitted: true, probe: false, state: "closed", retryAfterSeconds: null });
  }

  recordFailure(context: TrustedAdmissionContext): CircuitBreakerState {
    assertTrustedContext(context);
    if (!context.dependencyKey) throw new TypeError("DEPENDENCY_REQUIRED");
    const key = this.scopeKey(context);
    const timestamp = this.now();
    const current = this.states.get(key) ?? this.closed(key);
    const failures = boundedIncrement(current.consecutiveFailureCount);
    const opened = current.state === "half_open" || failures >= this.policy.failureThreshold;
    const next: CircuitBreakerState = Object.freeze({
      ...current,
      state: opened ? "open" : "closed",
      consecutiveFailureCount: failures,
      halfOpenProbeCount: 0,
      openedAt: opened ? timestamp : null,
      cooldownUntil: opened ? timestamp + this.policy.cooldownMs : null,
    });
    this.states.set(key, next);
    return next;
  }

  recordSuccess(context: TrustedAdmissionContext): CircuitBreakerState {
    assertTrustedContext(context);
    if (!context.dependencyKey) throw new TypeError("DEPENDENCY_REQUIRED");
    const next = this.closed(this.scopeKey(context));
    this.states.set(next.scopeKey, next);
    return next;
  }

  state(context: TrustedAdmissionContext): CircuitBreakerState {
    return this.states.get(this.scopeKey(context)) ?? this.closed(this.scopeKey(context));
  }

  private scopeKey(context: TrustedAdmissionContext): string {
    return context.tenantId
      ? `tenant:${context.tenantId}:provider:${context.dependencyKey}`
      : `provider:${context.dependencyKey}`;
  }

  private closed(scopeKey: string): CircuitBreakerState {
    return Object.freeze({
      scopeKey,
      state: "closed",
      consecutiveFailureCount: 0,
      halfOpenProbeCount: 0,
      openedAt: null,
      cooldownUntil: null,
    });
  }
}

export class LocalLoadShedding implements LoadSheddingPort {
  private mode: DegradationMode = "normal";
  private recoveryEligibleAt = 0;

  constructor(
    private readonly now: () => number,
    private readonly policy: LoadSheddingPolicy,
  ) {
    if (policy.recoveryHysteresisMs < 100 || policy.recoveryHysteresisMs > 604_800_000) {
      throw new TypeError("INVALID_LOAD_SHEDDING_POLICY");
    }
  }

  activate(mode: Exclude<DegradationMode, "normal">): void {
    this.mode = mode;
    this.recoveryEligibleAt = this.now() + this.policy.recoveryHysteresisMs;
  }

  recover(): boolean {
    if (this.now() < this.recoveryEligibleAt) return false;
    this.mode = "normal";
    this.recoveryEligibleAt = 0;
    return true;
  }

  currentMode(): DegradationMode {
    return this.mode;
  }

  async evaluate(context: TrustedAdmissionContext): Promise<AdmissionSheddingDecision> {
    assertTrustedContext(context);
    const decision = this.decision(context);
    return Object.freeze(decision);
  }

  private decision(context: TrustedAdmissionContext): AdmissionSheddingDecision {
    if (this.mode === "normal" || context.priority === "critical") {
      return { admitted: true, deferred: false, reasonCode: "LOAD_OK" };
    }
    if (this.mode === "protect_background" && context.priority === "background") {
      return { admitted: false, deferred: true, reasonCode: "BACKGROUND_DEFERRED" };
    }
    if (
      this.mode === "protect_optional"
      && (context.priority === "optional" || context.priority === "background")
    ) {
      return { admitted: false, deferred: context.priority === "background", reasonCode: "OPTIONAL_SHED" };
    }
    if (this.mode === "protect_writes" && context.operationClass !== "query") {
      return { admitted: false, deferred: false, reasonCode: "WRITE_SHED" };
    }
    if (this.mode === "emergency" && !isEmergencySafe(context.routeKey)) {
      return { admitted: false, deferred: false, reasonCode: "EMERGENCY_SHED" };
    }
    return { admitted: true, deferred: false, reasonCode: "LOAD_OK" };
  }
}

export class LocalWebhookDeduplicator implements WebhookDeduplicationPort {
  private readonly receipts = new Map<string, WebhookReceiptRecord>();

  constructor(
    private readonly now: () => number,
    private readonly uuidv7: UuidV7,
    private readonly ttlMs = 24 * 60 * 60 * 1000,
  ) {
    if (ttlMs < 1000 || ttlMs > 30 * 24 * 60 * 60 * 1000) {
      throw new TypeError("INVALID_WEBHOOK_TTL");
    }
  }

  async claim(fingerprint: WebhookEventFingerprint): Promise<WebhookReplayResult> {
    validateFingerprint(fingerprint);
    const key = webhookKey(fingerprint);
    const timestamp = this.now();
    const existing = this.receipts.get(key);
    if (existing && existing.expiresAt > timestamp) {
      if (existing.payloadFingerprint !== fingerprint.payloadFingerprint) {
        return Object.freeze({
          status: "fingerprint_conflict",
          receiptId: existing.receiptId,
          safeResult: Object.freeze({ code: "EVENT_FINGERPRINT_CONFLICT" }),
          executeMutation: false,
        });
      }
      const replay = Object.freeze({
        ...existing,
        replayCount: boundedIncrement(existing.replayCount),
        lastReceivedAt: timestamp,
      });
      this.receipts.set(key, replay);
      return Object.freeze({
        status: "duplicate_replay",
        receiptId: replay.receiptId,
        safeResult: replay.safeResult,
        executeMutation: false,
      });
    }
    const receipt: WebhookReceiptRecord = Object.freeze({
      ...fingerprint,
      receiptId: this.uuidv7.generate(),
      status: "processing",
      safeResult: null,
      replayCount: 0,
      firstReceivedAt: timestamp,
      lastReceivedAt: timestamp,
      expiresAt: timestamp + this.ttlMs,
    });
    this.receipts.set(key, receipt);
    return Object.freeze({
      status: "first_seen",
      receiptId: receipt.receiptId,
      safeResult: null,
      executeMutation: true,
    });
  }

  async complete(
    receiptId: string,
    safeResult: Readonly<Record<string, string | number | boolean | null>>,
  ): Promise<void> {
    const json = JSON.stringify(safeResult);
    if (json.length > 2048 || /token|authorization|request.?body|raw.?uid/i.test(json)) {
      throw new TypeError("UNSAFE_WEBHOOK_RESULT");
    }
    const pair = [...this.receipts.entries()].find(([, receipt]) => receipt.receiptId === receiptId);
    if (!pair) throw new TrafficProtectionError("DUPLICATE_EVENT", false);
    const [key, receipt] = pair;
    if (receipt.status === "completed") return;
    this.receipts.set(key, Object.freeze({
      ...receipt,
      status: "completed",
      safeResult: Object.freeze({ ...safeResult }),
    }));
  }

  get records(): readonly WebhookReceiptRecord[] {
    return Object.freeze([...this.receipts.values()]);
  }
}

export class LocalAcceptedOperationStore {
  private readonly receipts = new Map<string, AcceptedOperationReceipt>();

  constructor(private readonly uuidv7: UuidV7) {}

  accept(
    idempotencyKey: string,
    supportCode: string,
    retryAfterSeconds: number,
  ): AcceptedOperationReceipt {
    const existing = this.receipts.get(idempotencyKey);
    if (existing) return existing;
    const receipt = Object.freeze({
      receiptId: this.uuidv7.generate(),
      status: "accepted" as const,
      supportCode,
      retry: Object.freeze({
        retryable: true,
        retryAfterSeconds: Math.max(1, Math.min(3600, retryAfterSeconds)),
      }),
    });
    this.receipts.set(idempotencyKey, receipt);
    return receipt;
  }
}

export class LocalTrafficObservationAdapter implements TrafficObservationPort {
  private readonly events: TrafficObservation[] = [];
  get captured(): readonly TrafficObservation[] { return this.events; }
  async observe(event: TrafficObservation): Promise<void> {
    if (this.events.length >= 1000) this.events.shift();
    this.events.push(Object.freeze({ ...event }));
  }
}

export class DisabledTrafficObservationAdapter implements TrafficObservationPort {
  async observe(_event: TrafficObservation): Promise<void> {
    return Promise.resolve();
  }
}
export class LocalTrafficReadinessAdapter implements TrafficReadinessPort {
  constructor(private readonly loadShedding: LocalLoadShedding) {}
  async snapshot() {
    const mode = this.loadShedding.currentMode();
    return Object.freeze({
      emergency: mode === "emergency",
      reasonCode: mode === "emergency" ? "EMERGENCY_DEGRADATION_ACTIVE" : null,
    });
  }
}

export function isEmergencySafe(routeKey: string): boolean {
  return routeKey === "/health" || routeKey === "/ready" || routeKey === "/status"
    || routeKey.startsWith("/security/");
}

function validateFingerprint(fingerprint: WebhookEventFingerprint): void {
  const values = [
    fingerprint.tenantId,
    fingerprint.applicationScopeKey,
    fingerprint.providerKey,
    fingerprint.providerEventId,
    fingerprint.normalizedEventType,
  ];
  if (values.some((value) => !value.trim() || value.length > 200)) {
    throw new TypeError("INVALID_WEBHOOK_FINGERPRINT");
  }
  if (
    !/^digest:[0-9a-f]{64}$/.test(fingerprint.issuerContextDigest)
    || !/^[0-9a-f]{64}$/.test(fingerprint.payloadFingerprint)
  ) {
    throw new TypeError("INVALID_WEBHOOK_FINGERPRINT");
  }
}

function webhookKey(fingerprint: WebhookEventFingerprint): string {
  return [
    fingerprint.tenantId,
    fingerprint.applicationScopeKey,
    fingerprint.providerKey,
    fingerprint.issuerContextDigest,
    fingerprint.providerEventId,
  ].join("|");
}
