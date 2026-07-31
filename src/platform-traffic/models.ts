export type TrafficPriority = "critical" | "normal" | "background" | "optional";
export type AdmissionStatus =
  | "admitted"
  | "duplicate_replay"
  | "throttled"
  | "rejected"
  | "shed"
  | "circuit_open"
  | "dependency_unavailable";

export type TrafficErrorCode =
  | "RATE_LIMITED"
  | "TENANT_RATE_LIMITED"
  | "PLATFORM_BUSY"
  | "DUPLICATE_EVENT"
  | "EVENT_FINGERPRINT_CONFLICT"
  | "CIRCUIT_OPEN"
  | "DEPENDENCY_UNAVAILABLE"
  | "REQUEST_DEFERRED"
  | "SERVICE_DEGRADED"
  | "MODULE_NOT_ENABLED"
  | "PERMISSION_DENIED"
  | "STALE_WEBHOOK_LEASE"
  | "STALE_CIRCUIT_PROBE";

export interface TrustedAdmissionContext {
  readonly source: "trusted_runtime_context";
  readonly environment: "development" | "staging" | "production";
  readonly tenantId: string;
  readonly applicationId: string | null;
  readonly moduleKey: string;
  readonly routeKey: string;
  readonly priority: TrafficPriority;
  readonly operationClass: "query" | "mutation" | "expensive_mutation" | "background";
  readonly actorDigest: string | null;
  readonly ipDigest: string | null;
  readonly dependencyKey: string | null;
  readonly permissionGranted: boolean;
  readonly moduleEnabled: boolean;
}

export interface WebhookSignatureEvidence {
  readonly source: "trusted_signature_verifier";
  readonly verified: boolean;
}

export interface WebhookEventFingerprint {
  readonly tenantId: string;
  readonly applicationScopeKey: string;
  readonly providerKey: string;
  readonly providerEventId: string;
  readonly issuerContextDigest: string;
  readonly normalizedEventType: string;
  readonly payloadFingerprint: string;
}

export interface WebhookReceiptRecord extends WebhookEventFingerprint {
  readonly receiptId: string;
  readonly status: "processing" | "completed" | "failed_retryable" | "failed_terminal" | "expired";
  readonly safeResult: Readonly<Record<string, string | number | boolean | null>> | null;
  readonly leaseOwnerToken: string | null;
  readonly leaseExpiresAt: number | null;
  readonly attemptCount: number;
  readonly lastAttemptAt: number;
  readonly safeFailureCode: string | null;
  readonly completedAt: number | null;
  readonly replayCount: number;
  readonly firstReceivedAt: number;
  readonly lastReceivedAt: number;
  readonly expiresAt: number;
}

export interface WebhookReplayResult {
  readonly status: "first_seen" | "lease_takeover" | "processing_deferred" | "duplicate_replay" | "fingerprint_conflict" | "terminal_failure";
  readonly receiptId: string;
  readonly safeResult: Readonly<Record<string, string | number | boolean | null>> | null;
  readonly executeMutation: boolean;
  readonly leaseToken: string | null;
  readonly attemptCount: number;
  readonly retryAfterSeconds: number | null;
}

export interface RateLimitPolicy {
  readonly policyKey: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly burst: number;
  readonly cooldownMs: number;
  readonly enforcementMode: "enforce" | "observe";
  readonly priority: TrafficPriority;
}

export interface RateLimitDecision {
  readonly admitted: boolean;
  readonly observedOnly: boolean;
  readonly retryAfterSeconds: number | null;
  readonly reasonCode: "RATE_LIMIT_OK" | "RATE_LIMITED" | "TENANT_RATE_LIMITED" | "PLATFORM_RATE_LIMITED";
}

export interface TenantResourcePolicy {
  readonly windowMs: number;
  readonly concurrentRequests: number;
  readonly requestsPerWindow: number;
  readonly expensiveMutationsPerWindow: number;
  readonly backgroundIntentsPerWindow: number;
  readonly providerCallsPerWindow: number;
  readonly databaseWritesPerWindow: number;
}

export interface TenantResourceUsageSnapshot {
  readonly concurrentRequests: number;
  readonly requestsPerWindow: number;
  readonly expensiveMutationsPerWindow: number;
  readonly backgroundIntentsPerWindow: number;
  readonly providerCallsPerWindow: number;
  readonly databaseWritesPerWindow: number;
}

export interface TenantAdmissionBudget {
  readonly tenant: TenantResourcePolicy;
  readonly platform: TenantResourcePolicy;
}

export interface ResourceIsolationDecision {
  readonly admitted: boolean;
  readonly reasonCode: "RESOURCE_OK" | "TENANT_BUDGET_EXHAUSTED" | "PLATFORM_BUDGET_EXHAUSTED";
  readonly retryAfterSeconds: number | null;
  readonly leaseToken: string | null;
}

export interface CircuitBreakerPolicy {
  readonly failureThreshold: number;
  readonly cooldownMs: number;
  readonly halfOpenProbeLimit: number;
}

export interface CircuitBreakerState {
  readonly scopeKey: string;
  readonly state: "closed" | "open" | "half_open";
  readonly consecutiveFailureCount: number;
  readonly halfOpenProbeCount: number;
  readonly openedAt: number | null;
  readonly cooldownUntil: number | null;
  readonly version: number;
  readonly probeLeaseToken: string | null;
  readonly probeLeaseExpiresAt: number | null;
}

export interface CircuitBreakerDecision {
  readonly admitted: boolean;
  readonly probe: boolean;
  readonly state: CircuitBreakerState["state"];
  readonly retryAfterSeconds: number | null;
  readonly probeToken: string | null;
}

export type DegradationMode =
  | "normal"
  | "protect_background"
  | "protect_optional"
  | "protect_writes"
  | "emergency";

export interface LoadSheddingPolicy {
  readonly recoveryHysteresisMs: number;
}

export interface AdmissionSheddingDecision {
  readonly admitted: boolean;
  readonly deferred: boolean;
  readonly reasonCode: "LOAD_OK" | "BACKGROUND_DEFERRED" | "OPTIONAL_SHED" | "WRITE_SHED" | "EMERGENCY_SHED";
}

export interface RetryInstruction {
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
}

export interface AcceptedOperationReceipt {
  readonly receiptId: string;
  readonly status: "accepted" | "processing";
  readonly supportCode: string;
  readonly retry: RetryInstruction;
}

export interface AdmissionResult {
  readonly status: AdmissionStatus;
  readonly code: TrafficErrorCode | null;
  readonly supportCode: string | null;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
  readonly statusCategory: "succeeded" | "accepted" | "failed";
  readonly actionRequired: boolean;
}

export interface TrafficObservation {
  readonly eventType:
    | "traffic.rate_limited"
    | "traffic.tenant_throttled"
    | "traffic.platform_throttled"
    | "webhook.duplicate"
    | "webhook.fingerprint_conflict"
    | "circuit.opened"
    | "circuit.half_open"
    | "circuit.closed"
    | "degradation.activated"
    | "degradation.recovered"
    | "request.deferred";
  readonly tenantId: string | null;
  readonly operation: string;
  readonly reasonCode: string;
  readonly severity: "info" | "warning" | "error" | "critical";
}
