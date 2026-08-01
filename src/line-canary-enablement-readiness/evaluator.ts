import type { CanaryBudgetDecision, CanaryCohortDecision, CanaryDrillDecision, CanaryEgressDecision, CanaryFreshnessDecision, CanaryPauseDecision, CanaryPermitDecision, CanaryReadinessDecision } from "./models";

const FIXED_NO_GO = Object.freeze([
  "REAL_LINE_ADAPTER_DISABLED",
  "PROVIDER_EXECUTION_NOT_AUTHORIZED",
  "CANARY_EXECUTION_NOT_AUTHORIZED",
  "PROVIDER_TRANSPORT_FAKE_ONLY",
  "CREDENTIALS_NOT_PROVISIONED",
  "PUBLIC_WEBHOOK_NOT_CREATED",
  "EGRESS_EXECUTION_NOT_AUTHORIZED",
] as const);

export interface CanaryReadinessContext {
  readonly approvalSnapshotCandidate: boolean;
  readonly credentialBindingCandidate: boolean;
  readonly permitDecision: CanaryPermitDecision;
  readonly egressDecision: CanaryEgressDecision;
  readonly cohortDecision: CanaryCohortDecision;
  readonly budgetDecision: CanaryBudgetDecision;
  readonly freshnessDecision: CanaryFreshnessDecision;
  readonly pauseDecision: CanaryPauseDecision;
  readonly rollbackDrill: CanaryDrillDecision;
  readonly outageDrill: CanaryDrillDecision;
  readonly redeliveryDrillPassed: boolean;
  readonly killSwitchOperational: boolean;
  readonly auditEvidenceReady: boolean;
  readonly privacyRetentionApproved: boolean;
  readonly operationsReady: boolean;
}

export function evaluateLineCanaryReadiness(input?: CanaryReadinessContext): CanaryReadinessDecision {
  if (!input) return decision(false, ["CANARY_READINESS_INPUT_MISSING", ...FIXED_NO_GO]);
  const blockers: string[] = [];
  if (!input.approvalSnapshotCandidate) blockers.push("CANARY_APPROVAL_SNAPSHOT_NOT_READY");
  if (!input.credentialBindingCandidate) blockers.push("CANARY_CREDENTIAL_BINDING_NOT_READY");
  if (!input.permitDecision.candidateEligible) blockers.push("CANARY_PERMIT_NOT_READY");
  if (!input.egressDecision.policyMatched) blockers.push("CANARY_EGRESS_POLICY_NOT_READY");
  if (!input.cohortDecision.eligible) blockers.push("CANARY_COHORT_NOT_SELECTED");
  if (!input.budgetDecision.eligible) blockers.push("CANARY_BUDGET_NOT_READY");
  if (!input.freshnessDecision.fresh) blockers.push("CANARY_EVIDENCE_STALE");
  if (input.pauseDecision.paused) blockers.push("CANARY_AUTOMATIC_PAUSE_ACTIVE");
  if (!input.rollbackDrill.passed) blockers.push("CANARY_ROLLBACK_DRILL_NOT_READY");
  if (!input.outageDrill.passed) blockers.push("CANARY_OUTAGE_DRILL_NOT_READY");
  if (!input.redeliveryDrillPassed) blockers.push("CANARY_REDELIVERY_DRILL_NOT_READY");
  if (!input.killSwitchOperational) blockers.push("CANARY_KILL_SWITCH_NOT_OPERATIONAL");
  if (!input.auditEvidenceReady) blockers.push("CANARY_AUDIT_EVIDENCE_NOT_READY");
  if (!input.privacyRetentionApproved) blockers.push("CANARY_PRIVACY_RETENTION_NOT_APPROVED");
  if (!input.operationsReady) blockers.push("CANARY_OPERATIONS_NOT_READY");
  const controlsReady = blockers.length === 0;
  blockers.push(...FIXED_NO_GO);
  return decision(controlsReady, blockers);
}

function decision(controlsReady: boolean, blockers: readonly string[]): CanaryReadinessDecision {
  return Object.freeze({ decision: "NO-GO", lifecycle: "canary_enablement_readiness_candidate", controlsReady, maximumState: "canary_readiness_candidate", blockers: Object.freeze([...blockers]), executable: false, providerExecutionAuthorized: false, canaryExecutionAuthorized: false, productionAuthority: false, networkExecuted: false });
}
