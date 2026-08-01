import { LineConsolidationError, lineControlKeys, linePhaseKeys, type LineConsolidationFinding, type LineControlClaim } from "./models";

export const canonicalLineControlClaims = Object.freeze<readonly LineControlClaim[]>([
  Object.freeze({ control: "webhook_contract", phase: "adapter_enablement_readiness", claimType: "definition", authority: "none" }),
  Object.freeze({ control: "signature_verification", phase: "adapter_enablement_readiness", claimType: "definition", authority: "none" }),
  Object.freeze({ control: "signature_verification", phase: "isolated_provider_verification", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "normalization", phase: "channel_adapter_foundation", claimType: "canonical_owner", authority: "channel_boundary" }),
  Object.freeze({ control: "normalization", phase: "isolated_provider_verification", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "replay_dedup", phase: "channel_adapter_foundation", claimType: "canonical_owner", authority: "channel_boundary" }),
  Object.freeze({ control: "replay_dedup", phase: "isolated_provider_verification", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "replay_dedup", phase: "canary_enablement_readiness", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "reply_token", phase: "adapter_enablement_readiness", claimType: "definition", authority: "none" }),
  Object.freeze({ control: "reply_token", phase: "isolated_provider_verification", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "capability_rendering", phase: "adapter_enablement_readiness", claimType: "definition", authority: "none" }),
  Object.freeze({ control: "credential_reference", phase: "provider_execution_readiness", claimType: "governance", authority: "none" }),
  Object.freeze({ control: "credential_reference", phase: "canary_enablement_readiness", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "egress_policy", phase: "provider_execution_readiness", claimType: "governance", authority: "none" }),
  Object.freeze({ control: "egress_policy", phase: "canary_enablement_readiness", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "approval_governance", phase: "provider_execution_readiness", claimType: "definition", authority: "none" }),
  Object.freeze({ control: "approval_governance", phase: "canary_enablement_readiness", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "cost_quota", phase: "provider_execution_readiness", claimType: "governance", authority: "none" }),
  Object.freeze({ control: "cost_quota", phase: "canary_enablement_readiness", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "cohort_policy", phase: "canary_enablement_readiness", claimType: "definition", authority: "none" }),
  Object.freeze({ control: "kill_switch", phase: "provider_execution_readiness", claimType: "governance", authority: "none" }),
  Object.freeze({ control: "kill_switch", phase: "canary_enablement_readiness", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "rollback", phase: "provider_execution_readiness", claimType: "definition", authority: "none" }),
  Object.freeze({ control: "rollback", phase: "canary_enablement_readiness", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "outage_drill", phase: "canary_enablement_readiness", claimType: "verification", authority: "none" }),
  Object.freeze({ control: "evidence", phase: "consolidation_review", claimType: "canonical_owner", authority: "none" }),
]);

export function detectLineControlFindings(claims: readonly LineControlClaim[]): readonly LineConsolidationFinding[] {
  const allowedPhases = [...linePhaseKeys, "channel_adapter_foundation", "consolidation_review"];
  const allowedClaims = ["definition", "verification", "governance", "canonical_owner", "execution_authority"];
  const allowedAuthorities = ["none", "channel_boundary", "workbench_only", "provider", "canary"];
  const seen = new Set<string>();
  const findings: LineConsolidationFinding[] = [];
  for (const claim of claims) {
    const keys = ["control", "phase", "claimType", "authority"];
    if (Object.keys(claim).some((key) => !keys.includes(key)) || !lineControlKeys.includes(claim.control) || !allowedPhases.includes(claim.phase) || !allowedClaims.includes(claim.claimType) || !allowedAuthorities.includes(claim.authority)) throw new LineConsolidationError("LINE_CONSOLIDATION_CLAIM_INVALID");
    const key = `${claim.control}:${claim.phase}:${claim.claimType}`;
    if (seen.has(key)) findings.push(finding("DUPLICATE_CONTROL_CLAIM", claim.control, [claim.phase]));
    seen.add(key);
    if (claim.claimType === "execution_authority" || claim.authority === "provider" || claim.authority === "canary") findings.push(finding("EXECUTION_AUTHORITY_CONTRADICTION", claim.control, [claim.phase]));
    if (claim.authority === "workbench_only" && claim.phase !== "consolidation_review") findings.push(finding("WORKBENCH_AUTHORITY_DUPLICATION", claim.control, [claim.phase]));
  }
  for (const control of lineControlKeys) {
    const owners = claims.filter((item) => item.control === control && item.claimType === "canonical_owner");
    if (owners.length > 1) findings.push(finding("DUPLICATE_CANONICAL_OWNER", control, owners.map((item) => item.phase)));
  }
  return Object.freeze(findings.sort((a, b) => `${a.code}:${a.subject}`.localeCompare(`${b.code}:${b.subject}`)));
}

function finding(code: string, subject: string, phases: readonly string[]): LineConsolidationFinding {
  return Object.freeze({ severity: "blocking", code, subject, phases: Object.freeze([...phases].sort()) });
}
