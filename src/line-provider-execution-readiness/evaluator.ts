import { evaluateLineExecutionApprovals, validateLineProviderAccountSeparation } from "./approvals";
import { validateLineSecretEnvironmentSeparation } from "./secret-reference";
import type {
  LineCanaryDecision,
  LineCostQuotaDecision,
  LineEgressDecision,
  LineExecutionApprovalRecord,
  LineExecutionReadinessDecision,
  LineIncidentReadiness,
  LineProviderAccountOwnership,
  LineRollbackDecision,
  LineSecretReferenceMetadata,
} from "./models";

const FIXED_NO_GO_BLOCKERS = Object.freeze([
  "REAL_LINE_ADAPTER_DISABLED",
  "PROVIDER_EXECUTION_NOT_AUTHORIZED",
  "CREDENTIALS_NOT_PROVISIONED",
  "PUBLIC_WEBHOOK_NOT_CREATED",
  "EGRESS_EXECUTION_NOT_AUTHORIZED",
] as const);
const MAX_INCIDENT_DRILL_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface LineExecutionReadinessContext {
  readonly source: "trusted_governance";
  readonly scopeRef: string;
  readonly now: number;
  readonly approvals: readonly LineExecutionApprovalRecord[];
  readonly stagingSecretReference: LineSecretReferenceMetadata;
  readonly productionSecretReference: LineSecretReferenceMetadata;
  readonly stagingProviderAccount: LineProviderAccountOwnership;
  readonly productionProviderAccount: LineProviderAccountOwnership;
  readonly egressDecision: LineEgressDecision;
  readonly costQuotaDecision: LineCostQuotaDecision;
  readonly canaryDecision: LineCanaryDecision;
  readonly killSwitchOperational: boolean;
  readonly rollbackDecision: LineRollbackDecision;
  readonly incidentReadiness: LineIncidentReadiness;
  readonly privacyRetentionApproved: boolean;
  readonly operationsReady: boolean;
  readonly auditEvidenceReady: boolean;
  readonly evidenceFresh: boolean;
}

export function evaluateLineProviderExecutionReadiness(input?: LineExecutionReadinessContext): LineExecutionReadinessDecision {
  if (!input) return Object.freeze({ decision: "NO-GO", lifecycle: "execution_readiness_candidate", controlsReady: false, maximumStage: "execution_readiness_candidate", blockers: Object.freeze(["READINESS_INPUT_MISSING", ...FIXED_NO_GO_BLOCKERS]), providerExecutionAuthorized: false, productionAuthority: false, networkExecuted: false });
  const blockers: string[] = [];
  let approvalResult: ReturnType<typeof evaluateLineExecutionApprovals>;
  try {
    approvalResult = evaluateLineExecutionApprovals(input.approvals, { requiredScopeRef: input.scopeRef, now: input.now, source: input.source });
    blockers.push(...approvalResult.blockers);
  } catch {
    blockers.push("APPROVAL_SET_INVALID");
    approvalResult = Object.freeze({ valid: false, approvalRefs: Object.freeze([]), blockers: Object.freeze(["APPROVAL_SET_INVALID"]) });
  }
  try {
    const secrets = validateLineSecretEnvironmentSeparation(input.stagingSecretReference, input.productionSecretReference);
    blockers.push(...secrets.blockers);
  } catch {
    blockers.push("SECRET_REFERENCE_SET_INVALID");
  }
  try {
    validateLineProviderAccountSeparation(input.stagingProviderAccount, input.productionProviderAccount);
    if (input.stagingProviderAccount.status !== "verified" || input.productionProviderAccount.status !== "verified") blockers.push("PROVIDER_ACCOUNT_OWNERSHIP_NOT_VERIFIED");
  } catch {
    blockers.push("PROVIDER_ACCOUNT_OWNERSHIP_INVALID");
  }
  if (!input.egressDecision.allowedByPolicy) blockers.push("EGRESS_POLICY_DENIED");
  if (!input.costQuotaDecision.eligible) blockers.push("COST_OR_QUOTA_DENIED");
  if (!input.canaryDecision.allowed) blockers.push("CANARY_GATE_DENIED");
  if (!input.killSwitchOperational) blockers.push("KILL_SWITCH_NOT_OPERATIONAL");
  if (!input.rollbackDecision.allowed || input.rollbackDecision.resultingAdapterState !== "disabled") blockers.push("ROLLBACK_NOT_READY");
  if (input.incidentReadiness.status !== "current" || !Number.isSafeInteger(input.incidentReadiness.lastDrillAt) || input.incidentReadiness.lastDrillAt > input.now || input.now - input.incidentReadiness.lastDrillAt > MAX_INCIDENT_DRILL_AGE_MS) blockers.push("INCIDENT_ON_CALL_NOT_READY");
  if (!input.privacyRetentionApproved) blockers.push("PRIVACY_RETENTION_NOT_APPROVED");
  if (!input.operationsReady) blockers.push("OPERATIONS_NOT_READY");
  if (!input.auditEvidenceReady) blockers.push("AUDIT_EVIDENCE_NOT_READY");
  if (!input.evidenceFresh) blockers.push("EXECUTION_EVIDENCE_STALE");
  const controlsReady = blockers.length === 0;
  blockers.push(...FIXED_NO_GO_BLOCKERS);
  return Object.freeze({
    decision: "NO-GO",
    lifecycle: "execution_readiness_candidate",
    controlsReady,
    maximumStage: controlsReady && input.canaryDecision.resultingStage === "approved_for_canary" ? "approved_for_canary" : "execution_readiness_candidate",
    blockers: Object.freeze(blockers),
    providerExecutionAuthorized: false,
    productionAuthority: false,
    networkExecuted: false,
  });
}
