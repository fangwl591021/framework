export const lineDisabledAdapterMetadata = Object.freeze({
  adapterKey: "disabled_line_adapter",
  provider: "line",
  lifecycle: "readiness_candidate",
  enabled: false,
  approvedForProduction: false,
  credentials: "not_provisioned",
  remoteDatabaseUsed: false,
  deploymentPerformed: false,
  outboundNetworkAllowed: false,
  authority: "workbench_only",
});

export const lineLocalVerificationScenarios = Object.freeze([
  "valid_signature_vector",
  "missing_signature",
  "invalid_signature",
  "unknown_event",
  "stale_event",
  "stable_replay_key",
  "reply_token_expired",
  "reply_token_consumed",
  "capability_degradation",
  "rate_limited",
  "provider_outage",
  "kill_switch",
  "unsafe_retry_rejected",
  "credential_reference_rejected",
  "safe_evidence",
  "approval_missing",
] as const);

export type LineRetryDecision = Readonly<{
  action: "do_not_retry" | "retry_with_provider_key" | "manual_reconciliation";
  reasonCode: string;
  maximumAttempts: 0 | 1;
  networkExecuted: false;
}>;

export function decideLineRetry(input: Readonly<{
  operation: "reply" | "push" | "multicast" | "broadcast";
  failure: "timeout" | "provider_5xx" | "rate_limited" | "provider_4xx" | "unknown_result";
  mutationCommitted: boolean;
  providerRetryKeyAvailable: boolean;
}>): LineRetryDecision {
  if (input.operation === "reply" || input.mutationCommitted || input.failure === "provider_4xx") return Object.freeze({ action: "do_not_retry", reasonCode: "LINE_UNSAFE_RETRY_BLOCKED", maximumAttempts: 0, networkExecuted: false });
  if (input.failure === "unknown_result") return Object.freeze({ action: "manual_reconciliation", reasonCode: "LINE_RESULT_UNKNOWN", maximumAttempts: 0, networkExecuted: false });
  if (input.providerRetryKeyAvailable && (input.failure === "timeout" || input.failure === "provider_5xx" || input.failure === "rate_limited")) return Object.freeze({ action: "retry_with_provider_key", reasonCode: "LINE_PROVIDER_KEY_REQUIRED", maximumAttempts: 1, networkExecuted: false });
  return Object.freeze({ action: "do_not_retry", reasonCode: "LINE_RETRY_NOT_ELIGIBLE", maximumAttempts: 0, networkExecuted: false });
}

export function decideLineRateLimit(input: Readonly<{ killSwitch: boolean; providerAvailable: boolean; remainingCapacity: number; inFlight: number }>): Readonly<{
  eligibleForSimulation: boolean;
  reasonCode: string;
  retryAfterClass: "none" | "short" | "standard";
  networkExecuted: false;
}> {
  if (input.killSwitch) return Object.freeze({ eligibleForSimulation: false, reasonCode: "LINE_KILL_SWITCH_ACTIVE", retryAfterClass: "none", networkExecuted: false });
  if (!input.providerAvailable) return Object.freeze({ eligibleForSimulation: false, reasonCode: "LINE_PROVIDER_UNAVAILABLE", retryAfterClass: "standard", networkExecuted: false });
  if (!Number.isSafeInteger(input.remainingCapacity) || !Number.isSafeInteger(input.inFlight) || input.remainingCapacity <= 0 || input.inFlight < 0) return Object.freeze({ eligibleForSimulation: false, reasonCode: "LINE_RATE_LIMITED", retryAfterClass: "short", networkExecuted: false });
  return Object.freeze({ eligibleForSimulation: true, reasonCode: "LINE_SIMULATION_ELIGIBLE", retryAfterClass: "none", networkExecuted: false });
}

export interface LineReadinessApprovals {
  readonly architecture: boolean;
  readonly security: boolean;
  readonly privacy: boolean;
  readonly operations: boolean;
  readonly cost: boolean;
  readonly execution: boolean;
}

export function evaluateLineReadiness(input: Readonly<{
  approvals: LineReadinessApprovals;
  signatureVectorsPassed: boolean;
  replayTestsPassed: boolean;
  outageDrillPassed: boolean;
  rollbackDrillPassed: boolean;
  credentialReferencesProvisioned: boolean;
  realAdapterEnabled: boolean;
  killSwitchForcedDisabled: boolean;
}>): Readonly<{ decision: "NO-GO"; blockers: readonly string[]; maximumState: "readiness_candidate" }> {
  const blockers: string[] = [];
  for (const [key, approved] of Object.entries(input.approvals)) if (!approved) blockers.push(`APPROVAL_${key.toUpperCase()}_MISSING`);
  if (!input.signatureVectorsPassed) blockers.push("SIGNATURE_VECTORS_NOT_VERIFIED");
  if (!input.replayTestsPassed) blockers.push("REPLAY_NOT_VERIFIED");
  if (!input.outageDrillPassed) blockers.push("OUTAGE_DRILL_NOT_VERIFIED");
  if (!input.rollbackDrillPassed) blockers.push("ROLLBACK_DRILL_NOT_VERIFIED");
  if (!input.credentialReferencesProvisioned) blockers.push("CREDENTIALS_NOT_PROVISIONED");
  if (!input.realAdapterEnabled) blockers.push("REAL_ADAPTER_DISABLED");
  if (input.killSwitchForcedDisabled) blockers.push("KILL_SWITCH_FORCED_DISABLED");
  return Object.freeze({ decision: "NO-GO", blockers: Object.freeze(blockers), maximumState: "readiness_candidate" });
}

export const lineEnablementApprovalWorkflow = Object.freeze([
  Object.freeze({ order: 1, gate: "contract_review", status: "complete" }),
  Object.freeze({ order: 2, gate: "architecture_approval", status: "required" }),
  Object.freeze({ order: 3, gate: "security_privacy_approval", status: "required" }),
  Object.freeze({ order: 4, gate: "credential_provisioning", status: "blocked" }),
  Object.freeze({ order: 5, gate: "isolated_shadow_verification", status: "blocked" }),
  Object.freeze({ order: 6, gate: "operations_cost_approval", status: "blocked" }),
  Object.freeze({ order: 7, gate: "production_execution_approval", status: "blocked" }),
] as const);
