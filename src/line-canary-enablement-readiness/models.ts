export const lineCanaryEnablementReadinessStatus = Object.freeze({
  lifecycle: "canary_enablement_readiness_candidate",
  realAdapter: "disabled",
  providerExecution: "not_authorized",
  canaryExecution: "not_authorized",
  providerTransport: "fake_only",
  credentials: "not_provisioned",
  publicWebhook: "not_created",
  egress: "policy_decision_only",
  remoteD1: "not_used",
  deployment: "not_performed",
  productionUse: "not_allowed",
  authority: "workbench_only",
} as const);

export const canaryApprovalKinds = Object.freeze([
  "architecture",
  "security",
  "privacy",
  "operations",
  "cost",
  "execution",
] as const);
export type CanaryApprovalKind = (typeof canaryApprovalKinds)[number];
export type CanaryEnvironment = "staging" | "production";

export interface CanaryApprovalRecord {
  readonly approvalRef: string;
  readonly kind: CanaryApprovalKind;
  readonly scopeRef: string;
  readonly status: "approved" | "revoked";
  readonly validFromBucket: number;
  readonly validUntilBucket: number;
  readonly source: "trusted_governance";
}

export interface CanaryApprovalSnapshot {
  readonly snapshotVersion: 1;
  readonly snapshotRef: string;
  readonly scopeRef: string;
  readonly environment: CanaryEnvironment;
  readonly policyVersion: number;
  readonly createdAtBucket: number;
  readonly expiresAtBucket: number;
  readonly approvals: readonly CanaryApprovalRecord[];
  readonly source: "trusted_governance";
}

export interface CanaryExecutionPermit {
  readonly permitVersion: 1;
  readonly permitRef: string;
  readonly providerAccountRef: string;
  readonly environment: CanaryEnvironment;
  readonly approvalSnapshotRef: string;
  readonly credentialReferenceId: string;
  readonly credentialVersion: number;
  readonly egressPolicyVersion: number;
  readonly budgetPolicyVersion: number;
  readonly cohortPolicyVersion: number;
  readonly issuedAtBucket: number;
  readonly expiresAtBucket: number;
  readonly status: "candidate" | "paused" | "revoked" | "expired";
  readonly source: "trusted_governance";
  readonly executable: false;
  readonly productionAuthority: false;
}

export interface CanaryPermitDecision {
  readonly candidateEligible: boolean;
  readonly reasonCode: string;
  readonly maximumState: "canary_readiness_candidate";
  readonly executable: false;
  readonly productionAuthority: false;
  readonly networkExecuted: false;
}

export interface CanaryCredentialBinding {
  readonly bindingVersion: 1;
  readonly bindingRef: string;
  readonly provider: "line";
  readonly environment: CanaryEnvironment;
  readonly credentialReferenceId: string;
  readonly credentialVersion: number;
  readonly status: "planned" | "expired" | "revoked" | "unknown";
  readonly containsSecretValue: false;
}

export interface CanaryEgressTarget {
  readonly scheme: "https";
  readonly hostname: string;
  readonly port: 443;
  readonly method: "POST";
}

export interface CanaryEgressDecision {
  readonly policyMatched: boolean;
  readonly reasonCode: string;
  readonly enforcementMode: "decision_only";
  readonly networkExecuted: false;
}

export const canaryCohortKeys = Object.freeze(["internal_operators", "designated_testers"] as const);
export type CanaryCohortKey = (typeof canaryCohortKeys)[number];

export interface CanaryCohortPolicy {
  readonly policyVersion: number;
  readonly tenantScopeRef: string;
  readonly applicationScopeRef: string;
  readonly cohortKey: CanaryCohortKey;
  readonly trafficBasisPoints: number;
  readonly hardTrafficCeilingBasisPoints: number;
  readonly maximumMessagesPerRequest: number;
  readonly serverOwned: true;
}

export interface CanaryCohortDecision {
  readonly eligible: boolean;
  readonly cohortBucket: number;
  readonly reasonCode: string;
  readonly clientOverrideAccepted: false;
  readonly executable: false;
}

export interface CanaryBudgetPolicy {
  readonly policyVersion: number;
  readonly maximumRequestsPerMinute: number;
  readonly maximumMessagesPerRequest: number;
  readonly dailyCostMinorUnits: number;
  readonly monthlyCostMinorUnits: number;
  readonly retryAttemptsPerRequest: number;
  readonly serverOwned: true;
}

export interface CanaryBudgetUsage {
  readonly requestsInCurrentMinute: number;
  readonly messageCount: number;
  readonly dailyCostMinorUnitsUsed: number;
  readonly monthlyCostMinorUnitsUsed: number;
  readonly estimatedRequestCostMinorUnits: number;
  readonly retryAttempts: number;
  readonly costEvidenceFresh: boolean;
}

export interface CanaryBudgetDecision {
  readonly eligible: boolean;
  readonly pauseRequired: boolean;
  readonly reasonCode: string;
  readonly retryRemaining: number;
  readonly clientOverrideAccepted: false;
  readonly networkExecuted: false;
}

export const canaryFreshnessKinds = Object.freeze([
  "approval",
  "security",
  "rollback_drill",
  "outage_drill",
  "credential_rotation",
  "egress_policy",
  "budget_policy",
] as const);
export type CanaryFreshnessKind = (typeof canaryFreshnessKinds)[number];

export interface CanaryFreshnessEvidence {
  readonly kind: CanaryFreshnessKind;
  readonly evidenceRef: string;
  readonly verifiedAtBucket: number;
  readonly policyVersion: number;
  readonly source: "trusted_governance";
}

export interface CanaryFreshnessDecision {
  readonly fresh: boolean;
  readonly blockers: readonly string[];
  readonly serverWindowApplied: true;
}

export interface CanaryPauseSignals {
  readonly signatureFailureRateBasisPoints: number;
  readonly replayConflictRateBasisPoints: number;
  readonly provider429RateBasisPoints: number;
  readonly provider5xxRateBasisPoints: number;
  readonly costUsageBasisPoints: number;
  readonly latencyP95Ms: number;
  readonly evidenceFailure: boolean;
  readonly credentialRevoked: boolean;
  readonly approvalRevoked: boolean;
  readonly killSwitchActive: boolean;
}

export interface CanaryPauseDecision {
  readonly paused: boolean;
  readonly reasonCodes: readonly string[];
  readonly dispatchAllowed: false;
  readonly canaryExecutionAuthorized: false;
  readonly networkExecuted: false;
}

export interface CanaryDrillDecision {
  readonly passed: boolean;
  readonly resultingAdapterState: "disabled";
  readonly resultingTransport: "fake_only";
  readonly reasonCode: string;
  readonly providerDependencyRequired: false;
  readonly credentialDependencyRequired: false;
  readonly mutationPerformed: false;
  readonly networkExecuted: false;
}

export interface CanaryAuditEvidence {
  readonly evidenceVersion: 1;
  readonly lifecycle: "canary_enablement_readiness_candidate";
  readonly decision: "NO-GO";
  readonly permitRef: string;
  readonly snapshotRef: string;
  readonly egressPolicyVersion: number;
  readonly budgetPolicyVersion: number;
  readonly cohortPolicyVersion: number;
  readonly reasonCodes: readonly string[];
  readonly timeBucket: number;
  readonly cohortBucket: number;
  readonly providerExecutionAuthorized: false;
  readonly canaryExecutionAuthorized: false;
  readonly productionAuthority: false;
  readonly networkExecuted: false;
}

export interface CanaryReadinessDecision {
  readonly decision: "NO-GO";
  readonly lifecycle: "canary_enablement_readiness_candidate";
  readonly controlsReady: boolean;
  readonly maximumState: "canary_readiness_candidate";
  readonly blockers: readonly string[];
  readonly executable: false;
  readonly providerExecutionAuthorized: false;
  readonly canaryExecutionAuthorized: false;
  readonly productionAuthority: false;
  readonly networkExecuted: false;
}

export class LineCanaryReadinessError extends Error {
  constructor(readonly code:
    | "LINE_CANARY_APPROVAL_INVALID"
    | "LINE_CANARY_APPROVAL_UNTRUSTED"
    | "LINE_CANARY_PERMIT_INVALID"
    | "LINE_CANARY_CREDENTIAL_BINDING_INVALID"
    | "LINE_CANARY_EGRESS_INVALID"
    | "LINE_CANARY_COHORT_INVALID"
    | "LINE_CANARY_BUDGET_INVALID"
    | "LINE_CANARY_FRESHNESS_INVALID"
    | "LINE_CANARY_ROLLBACK_AUTHORITY_INVALID"
    | "LINE_CANARY_EVIDENCE_INVALID") {
    super(code);
    this.name = "LineCanaryReadinessError";
  }
}
