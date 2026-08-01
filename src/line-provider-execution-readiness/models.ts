export const lineProviderExecutionReadinessStatus = Object.freeze({
  lifecycle: "execution_readiness_candidate",
  realAdapter: "disabled",
  providerTransport: "fake_only",
  providerExecution: "not_authorized",
  credentials: "not_provisioned",
  publicWebhook: "not_created",
  egress: "policy_only",
  remoteD1: "not_used",
  deployment: "not_performed",
  productionUse: "not_allowed",
  authority: "workbench_only",
} as const);

export const lineExecutionApprovalKinds = Object.freeze([
  "architecture",
  "security",
  "privacy",
  "operations",
  "cost",
  "execution",
] as const);
export type LineExecutionApprovalKind = (typeof lineExecutionApprovalKinds)[number];
export type GovernanceEnvironment = "staging" | "production";

export interface LineExecutionApprovalRecord {
  readonly approvalRef: string;
  readonly kind: LineExecutionApprovalKind;
  readonly scopeRef: string;
  readonly status: "approved" | "revoked";
  readonly approverRole: string;
  readonly approvedAt: number;
  readonly expiresAt: number;
  readonly policyVersion: number;
  readonly source: "trusted_governance";
}

export interface LineSecretReferenceMetadata {
  readonly referenceId: string;
  readonly provider: "line";
  readonly environment: GovernanceEnvironment;
  readonly version: number;
  readonly status: "planned" | "provisioned" | "active" | "rotating" | "expired" | "revoked" | "unknown";
  readonly containsSecretValue: false;
}

export interface LineProviderAccountOwnership {
  readonly providerAccountRef: string;
  readonly environment: GovernanceEnvironment;
  readonly ownerTeamRef: string;
  readonly operationsOwnerRef: string;
  readonly billingOwnerRef: string;
  readonly status: "planned" | "verified" | "suspended";
  readonly clientOwned: false;
}

export interface LineIncidentReadiness {
  readonly runbookRef: string;
  readonly onCallRotationRef: string;
  readonly escalationPolicyRef: string;
  readonly incidentCommanderRole: string;
  readonly status: "current" | "stale" | "missing";
  readonly lastDrillAt: number;
}

export interface LineEgressTarget {
  readonly scheme: "https";
  readonly hostname: string;
  readonly port: 443;
  readonly method: "POST";
}

export interface LineEgressRequest extends LineEgressTarget {
  readonly redirectTarget: LineEgressTarget | null;
  readonly source: "trusted_policy";
}

export interface LineEgressDecision {
  readonly allowedByPolicy: boolean;
  readonly reasonCode: string;
  readonly networkExecuted: false;
  readonly dnsAuthority: false;
  readonly ipAuthority: false;
}

export interface LineCostQuotaPolicy {
  readonly policyVersion: number;
  readonly hardRequestMinorUnits: number;
  readonly dailyMinorUnits: number;
  readonly monthlyMinorUnits: number;
  readonly requestsPerMinute: number;
  readonly messagesPerRequest: number;
  readonly retryAttemptsPerRequest: number;
  readonly serverOwned: true;
}

export interface LineCostQuotaUsage {
  readonly requestMinorUnits: number;
  readonly dailyMinorUnitsUsed: number;
  readonly monthlyMinorUnitsUsed: number;
  readonly requestsInCurrentMinute: number;
  readonly messageCount: number;
  readonly retryAttempts: number;
}

export interface LineCostQuotaDecision {
  readonly eligible: boolean;
  readonly reasonCode: string;
  readonly remainingRetryAttempts: number;
  readonly clientOverrideAccepted: false;
  readonly networkExecuted: false;
}

export const lineCanaryStages = Object.freeze(["disabled", "internal", "limited", "paused", "approved_for_canary"] as const);
export type LineCanaryStage = (typeof lineCanaryStages)[number];

export interface LineCanaryGateContext {
  readonly currentStage: LineCanaryStage;
  readonly requestedStage: LineCanaryStage;
  readonly approvalsValid: boolean;
  readonly evidenceFresh: boolean;
  readonly killSwitchOperational: boolean;
  readonly rollbackReady: boolean;
  readonly budgetEligible: boolean;
  readonly regressionDetected: boolean;
}

export interface LineCanaryDecision {
  readonly allowed: boolean;
  readonly resultingStage: LineCanaryStage;
  readonly reasonCode: string;
  readonly productionAuthority: false;
  readonly networkExecuted: false;
}

export interface LineKillSwitchDecision {
  readonly active: boolean;
  readonly dispatchAllowed: false;
  readonly reasonCode: string;
  readonly evidenceWriteRequired: boolean;
  readonly evidenceFailureMayBlock: false;
  readonly networkExecuted: false;
}

export interface LineRollbackDecision {
  readonly allowed: boolean;
  readonly resultingAdapterState: "disabled";
  readonly secretState: "unchanged" | "remains_revoked";
  readonly reasonCode: string;
  readonly providerDependencyRequired: false;
  readonly networkExecuted: false;
}

export interface LineExecutionReadinessEvidence {
  readonly evidenceVersion: 1;
  readonly lifecycle: "execution_readiness_candidate";
  readonly decision: "NO-GO";
  readonly controlsReady: boolean;
  readonly approvalRefs: readonly string[];
  readonly policyVersion: number;
  readonly reasonCodes: readonly string[];
  readonly timestampBucket: string;
  readonly realAdapter: "disabled";
  readonly providerExecution: "not_authorized";
  readonly networkExecuted: false;
}

export interface LineExecutionReadinessDecision {
  readonly decision: "NO-GO";
  readonly lifecycle: "execution_readiness_candidate";
  readonly controlsReady: boolean;
  readonly maximumStage: "execution_readiness_candidate" | "approved_for_canary";
  readonly blockers: readonly string[];
  readonly providerExecutionAuthorized: false;
  readonly productionAuthority: false;
  readonly networkExecuted: false;
}

export class LineProviderExecutionReadinessError extends Error {
  constructor(readonly code:
    | "LINE_EXECUTION_APPROVAL_INVALID"
    | "LINE_EXECUTION_APPROVAL_UNTRUSTED"
    | "LINE_SECRET_REFERENCE_INVALID"
    | "LINE_SECRET_ROTATION_INVALID"
    | "LINE_PROVIDER_ACCOUNT_INVALID"
    | "LINE_EGRESS_POLICY_INVALID"
    | "LINE_COST_POLICY_INVALID"
    | "LINE_CANARY_TRANSITION_INVALID"
    | "LINE_KILL_SWITCH_AUTHORITY_INVALID"
    | "LINE_ROLLBACK_AUTHORITY_INVALID"
    | "LINE_EXECUTION_EVIDENCE_INVALID") {
    super(code);
    this.name = "LineProviderExecutionReadinessError";
  }
}
