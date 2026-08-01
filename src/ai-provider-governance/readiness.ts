import type { ProviderReadinessSnapshot, ReadinessAssessment, ReadinessFinding } from "./models";

const finding = (findingCode: string, severity: ReadinessFinding["severity"], category: string, message: string, remediation: string, blocking = severity === "critical"): ReadinessFinding => ({
  findingCode, severity, category, message, remediation, evidenceReference: `governance:${category}:${findingCode}`, blocking,
});

export function evaluateProviderReadiness(snapshot: ProviderReadinessSnapshot): ReadinessAssessment {
  if (!snapshot.external && snapshot.providerKey === "deterministic_local_adapter")
    return { result: "ready_for_local_only", score: 100, findings: [finding("LOCAL_ONLY", "info", "environment", "Deterministic adapter is approved for isolated local use only.", "Keep external execution disabled.", false)] };
  const findings: ReadinessFinding[] = [];
  if (snapshot.lifecycle !== "approved_for_shadow") findings.push(finding("LIFECYCLE_NOT_APPROVED", "critical", "lifecycle", "Provider is not approved for shadow governance.", "Complete ordered lifecycle reviews."));
  if (snapshot.complianceStatus !== "approved" || snapshot.complianceExpiresAt === null || snapshot.complianceExpiresAt <= snapshot.now) findings.push(finding("COMPLIANCE_NOT_CURRENT", "critical", "compliance", "Compliance profile is incomplete, rejected, or expired.", "Record a current approved profile."));
  if (!snapshot.dataPolicyActive) findings.push(finding("DATA_POLICY_MISSING", "critical", "data_policy", "No active data policy is available.", "Approve a bounded policy."));
  if (snapshot.secretStatus !== "active_future") findings.push(finding("SECRET_NOT_VALIDATED", "critical", "secret", "Secret reference is not provisioned and validated.", "Provision in a future reviewed phase."));
  if (snapshot.matrixMode !== "shadow_only") findings.push(finding("MATRIX_DISABLED", "critical", "matrix", "No exact shadow-only task mapping is active.", "Create an exact reviewed mapping."));
  if (!snapshot.hardCeilingActive) findings.push(finding("HARD_CEILING_MISSING", "critical", "budget", "Platform hard ceiling is unavailable.", "Install a platform-owned ceiling."));
  if (snapshot.killSwitchState !== "enabled") findings.push(finding("KILL_SWITCH_BLOCKED", "critical", "kill_switch", "A governing kill switch blocks new work.", "Resolve the incident before re-enablement."));
  if (!snapshot.observabilityReady) findings.push(finding("OBSERVABILITY_NOT_READY", "critical", "observability", "Required provider observations are unavailable.", "Restore diagnostic evidence."));
  if (!snapshot.usageEvidenceReady) findings.push(finding("USAGE_NOT_READY", "critical", "usage", "Immutable usage evidence is unavailable.", "Restore usage recording."));
  if (snapshot.shadowPlanStatus !== "approved" || snapshot.shadowPlanExpiresAt === null || snapshot.shadowPlanExpiresAt <= snapshot.now) findings.push(finding("SHADOW_PLAN_NOT_APPROVED", "critical", "shadow", "Shadow plan is absent, unapproved, or expired.", "Approve a bounded shadow plan."));
  if (snapshot.canaryPlanStatus !== "draft") findings.push(finding("CANARY_SCOPE_INVALID", "critical", "canary", "Canary state exceeds this phase boundary.", "Return to draft; execution is forbidden."));
  if (!snapshot.rollbackPlanReady) findings.push(finding("ROLLBACK_MISSING", "critical", "rollback", "No reviewed rollback plan is available.", "Record deterministic restoration steps."));
  if (!snapshot.incidentRunbookReady) findings.push(finding("RUNBOOK_MISSING", "critical", "incident", "Provider incident runbooks are incomplete.", "Record required incident runbooks."));
  if (!snapshot.ownerAssigned) findings.push(finding("OWNER_MISSING", "critical", "ownership", "Governance owner is not assigned.", "Assign a platform owner."));
  if (!snapshot.approvalsSeparated) findings.push(finding("ROLE_SEPARATION_MISSING", "critical", "approval", "Required approvals are not role-separated.", "Use distinct reviewer roles."));
  const critical = findings.filter((item) => item.severity === "critical" && item.blocking).length;
  const warnings = findings.filter((item) => item.severity === "warning").length;
  return { result: critical ? "not_ready" : warnings ? "conditionally_ready" : "ready", score: Math.max(0, 100 - critical * 8 - warnings * 3), findings };
}

export function withoutHiddenCriticalFindings(assessment: ReadinessAssessment, hiddenCodes: readonly string[]): ReadinessAssessment {
  const critical = new Set(assessment.findings.filter((item) => item.blocking && item.severity === "critical").map((item) => item.findingCode));
  if (hiddenCodes.some((code) => critical.has(code))) throw new Error("CRITICAL_FINDING_CANNOT_HIDE");
  return { ...assessment, findings: assessment.findings.filter((item) => !hiddenCodes.includes(item.findingCode)) };
}
