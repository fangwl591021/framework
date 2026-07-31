import { ProviderGovernanceError, type DataSensitivity, type HardCeiling, type HardCeilingUsage, type KillSwitchState, type ProviderDataPolicy, type ProviderLifecycleState } from "./models";

const sensitivityRank: Record<DataSensitivity, number> = { public: 0, internal: 1, confidential: 2, restricted: 3, prohibited: 4 };
const transitions: Readonly<Record<ProviderLifecycleState, readonly ProviderLifecycleState[]>> = {
  draft: ["compliance_review", "suspended", "revoked"],
  compliance_review: ["security_review", "suspended", "revoked"],
  security_review: ["approved_for_shadow", "suspended", "revoked"],
  approved_for_shadow: ["suspended", "revoked", "retired"],
  shadow_active: [], canary_approved: [], canary_active: [], production_approved: [], production_active: [],
  suspended: ["compliance_review", "revoked", "retired"], revoked: [], retired: [],
};

export function assertLifecycleTransition(from: ProviderLifecycleState | null, to: ProviderLifecycleState): void {
  if (from === null ? to !== "draft" : !transitions[from].includes(to))
    throw new ProviderGovernanceError("AI_PROVIDER_LIFECYCLE_INVALID");
  if (["shadow_active", "canary_approved", "canary_active", "production_approved", "production_active"].includes(to))
    throw new ProviderGovernanceError("AI_PROVIDER_LIFECYCLE_INVALID");
}

export function strictestSensitivity(task: DataSensitivity, input: DataSensitivity): DataSensitivity {
  return sensitivityRank[task] >= sensitivityRank[input] ? task : input;
}

export function assertDataHandling(values: {
  taskSensitivity: DataSensitivity;
  inputSensitivity: DataSensitivity;
  policy: ProviderDataPolicy;
  complianceRetentionDays: number;
  regionMatches: boolean;
  deletionSupported: boolean;
}): void {
  const sensitivity = strictestSensitivity(values.taskSensitivity, values.inputSensitivity);
  if (sensitivity === "prohibited" || sensitivityRank[sensitivity] > sensitivityRank[values.policy.allowedSensitivity])
    throw new ProviderGovernanceError("AI_PROVIDER_DATA_POLICY_DENIED");
  if (sensitivity === "restricted" && (!values.policy.requireZeroRetention || !values.policy.requireRegionalProcessing || !values.policy.requireDeletionCapability))
    throw new ProviderGovernanceError("AI_PROVIDER_DATA_POLICY_DENIED");
  if ((values.policy.requireZeroRetention && values.complianceRetentionDays !== 0) || values.complianceRetentionDays > values.policy.maximumRetentionDays)
    throw new ProviderGovernanceError("AI_PROVIDER_DATA_POLICY_DENIED");
  if (values.policy.requireRegionalProcessing && !values.regionMatches)
    throw new ProviderGovernanceError("AI_PROVIDER_DATA_POLICY_DENIED");
  if (values.policy.requireDeletionCapability && !values.deletionSupported)
    throw new ProviderGovernanceError("AI_PROVIDER_DATA_POLICY_DENIED");
}

export function assertHardCeiling(ceiling: HardCeiling, usage: HardCeilingUsage, request: { inputUnits: number; outputUnits: number; estimatedCostMicros: number; premium: boolean }): void {
  if (request.inputUnits > ceiling.maximumInputUnitsPerRequest || request.outputUnits > ceiling.maximumOutputUnitsPerRequest ||
      usage.requestsToday + 1 > ceiling.maximumRequestsPerDay || usage.estimatedCostMicrosToday + request.estimatedCostMicros > ceiling.maximumEstimatedCostMicrosPerDay ||
      usage.concurrentRequests + 1 > ceiling.maximumConcurrentRequests || (request.premium && usage.premiumRequestsToday + 1 > ceiling.maximumPremiumRequestsPerDay))
    throw new ProviderGovernanceError("AI_HARD_CEILING_EXCEEDED");
}

export function assertKillSwitch(state: KillSwitchState, scope: string, interactive = true): void {
  if (state === "enabled" || (state === "drain_only" && !interactive)) return;
  const code = scope === "model" ? "AI_MODEL_KILLED" : scope === "task" || scope === "provider_task" ? "AI_TASK_KILLED" : scope === "environment" ? "AI_ENVIRONMENT_KILLED" : "AI_PROVIDER_KILLED";
  throw new ProviderGovernanceError(code);
}

export function assertSecretReference(value: Readonly<Record<string, unknown>>): void {
  const allowed = new Set(["secretReferenceId", "providerKey", "environment", "referenceName", "status", "version", "createdAt", "expiresAt"]);
  if (Object.keys(value).some((key) => !allowed.has(key)) || "secret" in value || "value" in value || "apiKey" in value)
    throw new ProviderGovernanceError("AI_PROVIDER_GOVERNANCE_DENIED");
  if (value.status !== "planned") throw new ProviderGovernanceError("AI_PROVIDER_SECRET_NOT_READY");
}

export function assertExactTaskMatrix(taskKey: string, mode: string): void {
  if (!taskKey || taskKey === "*" || taskKey === "all" || !["disabled", "shadow_only"].includes(mode))
    throw new ProviderGovernanceError("AI_PROVIDER_MATRIX_DENIED");
}

export function deterministicSample(seed: string, basisPoints: number): boolean {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) return false;
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
  return value % 10000 < basisPoints;
}

export function assertSafeGovernanceEvidence(value: unknown): void {
  const encoded = JSON.stringify(value);
  if (encoded.length > 16384 || /prompt|completion|authorization|api[_-]?key|secret.value|stack|sql/i.test(encoded))
    throw new ProviderGovernanceError("AI_PROVIDER_GOVERNANCE_DENIED");
}
