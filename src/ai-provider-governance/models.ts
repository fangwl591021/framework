export const PROVIDER_GOVERNANCE_MODULE_KEY = "ai-provider-enablement-readiness";

export const providerLifecycleStates = [
  "draft", "compliance_review", "security_review", "approved_for_shadow",
  "shadow_active", "canary_approved", "canary_active", "production_approved",
  "production_active", "suspended", "revoked", "retired",
] as const;
export type ProviderLifecycleState = (typeof providerLifecycleStates)[number];
export type ProviderEnvironment = "local" | "development" | "staging" | "production";
export type DataSensitivity = "public" | "internal" | "confidential" | "restricted" | "prohibited";
export type ReadinessResult = "ready" | "conditionally_ready" | "not_ready" | "ready_for_local_only";
export type KillSwitchState = "enabled" | "disabled" | "drain_only";
export type KillSwitchScope = "platform" | "environment" | "provider" | "model" | "tenant" | "application" | "task" | "provider_task";

export interface ProviderGovernanceContext {
  readonly source: "platform_operator_context";
  readonly actorReference: string;
  readonly permissions: readonly string[];
  readonly correlationId: string;
}

export interface ReadinessFinding {
  readonly findingCode: string;
  readonly severity: "info" | "warning" | "critical";
  readonly category: string;
  readonly message: string;
  readonly remediation: string;
  readonly evidenceReference: string;
  readonly blocking: boolean;
}

export interface ProviderReadinessSnapshot {
  readonly providerKey: string;
  readonly providerVersion: string;
  readonly environment: ProviderEnvironment;
  readonly external: boolean;
  readonly lifecycle: ProviderLifecycleState | null;
  readonly complianceStatus: "incomplete" | "under_review" | "approved" | "rejected" | "expired" | null;
  readonly complianceExpiresAt: number | null;
  readonly dataPolicyActive: boolean;
  readonly secretStatus: "planned" | "provisioned_future" | "active_future" | "rotation_due" | "revoked" | "expired" | null;
  readonly matrixMode: "disabled" | "shadow_only" | null;
  readonly hardCeilingActive: boolean;
  readonly killSwitchState: KillSwitchState;
  readonly observabilityReady: boolean;
  readonly usageEvidenceReady: boolean;
  readonly shadowPlanStatus: "draft" | "approved" | null;
  readonly shadowPlanExpiresAt: number | null;
  readonly canaryPlanStatus: "draft" | null;
  readonly rollbackPlanReady: boolean;
  readonly incidentRunbookReady: boolean;
  readonly ownerAssigned: boolean;
  readonly approvalsSeparated: boolean;
  readonly now: number;
}

export interface ReadinessAssessment {
  readonly result: ReadinessResult;
  readonly score: number;
  readonly findings: readonly ReadinessFinding[];
}

export interface ProviderDataPolicy {
  readonly allowedSensitivity: Exclude<DataSensitivity, "prohibited">;
  readonly allowPromptRetention: boolean;
  readonly allowProviderTraining: boolean;
  readonly allowCrossRegion: boolean;
  readonly requireZeroRetention: boolean;
  readonly requireRegionalProcessing: boolean;
  readonly requireDeletionCapability: boolean;
  readonly maximumRetentionDays: number;
  readonly redactionRequired: boolean;
  readonly structuredOutputRequired: boolean;
}

export interface HardCeiling {
  readonly maximumRequestsPerDay: number;
  readonly maximumEstimatedCostMicrosPerDay: number;
  readonly maximumPremiumRequestsPerDay: number;
  readonly maximumConcurrentRequests: number;
  readonly maximumInputUnitsPerRequest: number;
  readonly maximumOutputUnitsPerRequest: number;
  readonly pricingVersion: string;
}

export interface HardCeilingUsage {
  readonly requestsToday: number;
  readonly estimatedCostMicrosToday: number;
  readonly premiumRequestsToday: number;
  readonly concurrentRequests: number;
}

export type ProviderGovernanceErrorCode =
  | "AI_PROVIDER_GOVERNANCE_DENIED"
  | "AI_PROVIDER_LIFECYCLE_INVALID"
  | "AI_PROVIDER_COMPLIANCE_REQUIRED"
  | "AI_PROVIDER_DATA_POLICY_DENIED"
  | "AI_PROVIDER_SECRET_NOT_READY"
  | "AI_PROVIDER_MATRIX_DENIED"
  | "AI_PROVIDER_KILLED"
  | "AI_MODEL_KILLED"
  | "AI_TASK_KILLED"
  | "AI_ENVIRONMENT_KILLED"
  | "AI_HARD_CEILING_EXCEEDED"
  | "AI_PROVIDER_GOVERNANCE_UNAVAILABLE"
  | "AI_PROVIDER_IDEMPOTENCY_CONFLICT";

export class ProviderGovernanceError extends Error {
  constructor(readonly code: ProviderGovernanceErrorCode) {
    super(code);
    this.name = "ProviderGovernanceError";
  }
}

export interface ProviderRouteGovernanceRequest {
  readonly providerKey: string;
  readonly modelKey: string;
  readonly modelVersion: string;
  readonly taskKey: string;
  readonly taskVersion: number;
  readonly environment: ProviderEnvironment;
  readonly tenantId: string;
  readonly applicationId: string;
  readonly sensitivity: DataSensitivity;
  readonly inputUnits: number;
  readonly outputUnits: number;
  readonly estimatedCostMicros: number;
  readonly interactive: boolean;
}

export interface ProviderGovernanceGate {
  authorize(request: ProviderRouteGovernanceRequest): Promise<void>;
}
