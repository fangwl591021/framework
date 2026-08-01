export const lineConsolidationStatus = Object.freeze({
  lifecycle: "consolidation_review_candidate",
  realAdapter: "disabled",
  providerExecution: "not_authorized",
  canaryExecution: "not_authorized",
  providerSandboxEntry: "not_authorized",
  providerTransport: "fake_only",
  credentials: "not_provisioned",
  publicWebhook: "not_created",
  egress: "policy_decision_only",
  remoteD1: "not_used",
  deployment: "not_performed",
  productionUse: "not_allowed",
  authority: "workbench_only",
} as const);

export const linePhaseKeys = Object.freeze([
  "adapter_enablement_readiness",
  "isolated_provider_verification",
  "provider_execution_readiness",
  "canary_enablement_readiness",
] as const);
export type LinePhaseKey = (typeof linePhaseKeys)[number];

export const linePhaseLifecycles = Object.freeze({
  adapter_enablement_readiness: "readiness_candidate",
  isolated_provider_verification: "isolated_verification_candidate",
  provider_execution_readiness: "execution_readiness_candidate",
  canary_enablement_readiness: "canary_enablement_readiness_candidate",
} as const);

export interface LinePhaseSnapshotRecord {
  readonly phase: LinePhaseKey;
  readonly lifecycle: (typeof linePhaseLifecycles)[LinePhaseKey];
  readonly evidenceRef: string;
  readonly verifiedAtBucket: number;
  readonly realAdapter: "disabled";
  readonly providerExecution: "not_authorized";
  readonly canaryExecution: "not_authorized";
  readonly providerTransport: "fake_only";
  readonly credentials: "not_provisioned";
  readonly publicWebhook: "not_created";
  readonly egress: "policy_decision_only";
  readonly remoteD1: "not_used";
  readonly deployment: "not_performed";
  readonly productionUse: "not_allowed";
  readonly authority: "workbench_only";
  readonly source: "trusted_repository";
}

export interface LineConsolidationSnapshot {
  readonly snapshotVersion: 1;
  readonly snapshotRef: string;
  readonly policyVersion: number;
  readonly createdAtBucket: number;
  readonly phases: readonly LinePhaseSnapshotRecord[];
  readonly source: "trusted_repository";
}

export const lineControlKeys = Object.freeze([
  "webhook_contract",
  "signature_verification",
  "normalization",
  "replay_dedup",
  "reply_token",
  "capability_rendering",
  "credential_reference",
  "egress_policy",
  "approval_governance",
  "cost_quota",
  "cohort_policy",
  "kill_switch",
  "rollback",
  "outage_drill",
  "evidence",
] as const);
export type LineControlKey = (typeof lineControlKeys)[number];
export type LineControlClaimType = "definition" | "verification" | "governance" | "canonical_owner" | "execution_authority";

export interface LineControlClaim {
  readonly control: LineControlKey;
  readonly phase: LinePhaseKey | "channel_adapter_foundation" | "consolidation_review";
  readonly claimType: LineControlClaimType;
  readonly authority: "none" | "channel_boundary" | "workbench_only" | "provider" | "canary";
}

export interface LineConsolidationFinding {
  readonly severity: "blocking" | "advisory";
  readonly code: string;
  readonly subject: string;
  readonly phases: readonly string[];
}

export interface LineCanonicalStateProjection {
  readonly lifecycle: "consolidation_review_candidate";
  readonly sourcePhases: readonly LinePhaseKey[];
  readonly realAdapter: "disabled";
  readonly providerExecution: "not_authorized";
  readonly canaryExecution: "not_authorized";
  readonly providerSandboxEntry: "not_authorized";
  readonly providerTransport: "fake_only";
  readonly credentials: "not_provisioned";
  readonly publicWebhook: "not_created";
  readonly egress: "policy_decision_only";
  readonly remoteD1: "not_used";
  readonly deployment: "not_performed";
  readonly productionUse: "not_allowed";
  readonly authority: "workbench_only";
  readonly deterministic: true;
}

export const lineEvidenceCategories = Object.freeze([
  "webhook_contract",
  "signature_contract",
  "signature_vectors",
  "normalization_bounds",
  "replay_dedup",
  "reply_token_lifecycle",
  "fake_transport",
  "approval_snapshot",
  "credential_reference_model",
  "egress_policy_model",
  "budget_quota_model",
  "cohort_policy_model",
  "kill_switch_model",
  "rollback_simulation",
  "outage_simulation",
  "safe_evidence_model",
  "provider_sandbox_account",
  "provider_credentials",
  "provider_webhook_delivery",
  "provider_egress_enforcement",
  "provider_redelivery_evidence",
  "provider_outage_evidence",
  "operational_rollback_evidence",
  "privacy_approval",
  "operations_approval",
  "cost_approval",
  "execution_approval",
] as const);
export type LineEvidenceCategory = (typeof lineEvidenceCategories)[number];
export type LineEvidenceClass = "locally_completed_control" | "real_world_prerequisite";

export interface LineEvidenceRecord {
  readonly category: LineEvidenceCategory;
  readonly evidenceClass: LineEvidenceClass;
  readonly evidenceRef: string;
  readonly sourcePhase: LinePhaseKey | "external_governance";
  readonly status: "verified" | "missing" | "expired" | "not_started";
  readonly verifiedAtBucket: number | null;
  readonly maximumAgeBuckets: number;
  readonly source: "trusted_repository" | "trusted_governance";
}

export interface LineEvidenceGapClassification {
  readonly locallyCompletedControls: readonly LineEvidenceCategory[];
  readonly realWorldPrerequisites: readonly LineEvidenceCategory[];
  readonly staleEvidence: readonly LineEvidenceCategory[];
  readonly missingEvidence: readonly LineEvidenceCategory[];
  readonly localEvidenceComplete: boolean;
  readonly realWorldEvidenceComplete: boolean;
}

export interface LineSandboxEntryDecision {
  readonly decision: "NO-GO";
  readonly lifecycle: "consolidation_review_candidate";
  readonly criteriaComplete: boolean;
  readonly blockers: readonly string[];
  readonly providerSandboxEntryAuthorized: false;
  readonly providerExecutionAuthorized: false;
  readonly canaryExecutionAuthorized: false;
  readonly productionAuthority: false;
  readonly networkExecuted: false;
}

export interface LineConsolidationDecision {
  readonly decision: "NO-GO";
  readonly lifecycle: "consolidation_review_candidate";
  readonly canonicalStateConsistent: boolean;
  readonly duplicateAuthorityFree: boolean;
  readonly localEvidenceComplete: boolean;
  readonly realWorldEvidenceComplete: boolean;
  readonly findings: readonly LineConsolidationFinding[];
  readonly blockers: readonly string[];
  readonly providerExecutionAuthorized: false;
  readonly canaryExecutionAuthorized: false;
  readonly providerSandboxEntryAuthorized: false;
  readonly productionAuthority: false;
  readonly networkExecuted: false;
}

export class LineConsolidationError extends Error {
  constructor(readonly code:
    | "LINE_CONSOLIDATION_SNAPSHOT_INVALID"
    | "LINE_CONSOLIDATION_SNAPSHOT_UNTRUSTED"
    | "LINE_CONSOLIDATION_CLAIM_INVALID"
    | "LINE_CONSOLIDATION_EVIDENCE_INVALID") {
    super(code);
    this.name = "LineConsolidationError";
  }
}
