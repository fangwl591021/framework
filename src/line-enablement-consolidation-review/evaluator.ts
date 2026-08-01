import { projectCanonicalLineState } from "./canonical-state";
import { canonicalLineControlClaims, detectLineControlFindings } from "./detector";
import { classifyLineEvidenceGaps } from "./evidence-gaps";
import { decideLineProviderSandboxEntry } from "./sandbox-entry";
import type { LineConsolidationDecision, LineConsolidationSnapshot, LineControlClaim, LineEvidenceRecord } from "./models";

const FIXED_NO_GO = Object.freeze([
  "REAL_LINE_ADAPTER_DISABLED",
  "PROVIDER_EXECUTION_NOT_AUTHORIZED",
  "CANARY_EXECUTION_NOT_AUTHORIZED",
  "PROVIDER_SANDBOX_ENTRY_NOT_AUTHORIZED",
  "PROVIDER_TRANSPORT_FAKE_ONLY",
  "CREDENTIALS_NOT_PROVISIONED",
  "PUBLIC_WEBHOOK_NOT_CREATED",
  "EGRESS_POLICY_DECISION_ONLY",
  "REMOTE_D1_NOT_USED",
  "DEPLOYMENT_NOT_PERFORMED",
] as const);

export function evaluateLineEnablementConsolidation(input?: Readonly<{
  snapshot: LineConsolidationSnapshot;
  controlClaims?: readonly LineControlClaim[];
  evidence: readonly LineEvidenceRecord[];
  nowBucket: number;
}>): LineConsolidationDecision {
  if (!input) return decision(false, false, false, false, [], ["CONSOLIDATION_INPUT_MISSING", ...FIXED_NO_GO]);
  const projection = projectCanonicalLineState(input.snapshot);
  const controlFindings = detectLineControlFindings(input.controlClaims ?? canonicalLineControlClaims);
  const findings = Object.freeze([...projection.findings, ...controlFindings].sort((a, b) => `${a.code}:${a.subject}`.localeCompare(`${b.code}:${b.subject}`)));
  const gaps = classifyLineEvidenceGaps(input.evidence, input.nowBucket);
  const canonicalStateConsistent = projection.findings.length === 0;
  const duplicateAuthorityFree = controlFindings.length === 0;
  const sandbox = decideLineProviderSandboxEntry({ evidence: gaps, canonicalStateConsistent, duplicateAuthorityFree, workbenchSoleAuthority: projection.projection.authority === "workbench_only" });
  const blockers: string[] = [];
  if (!canonicalStateConsistent) blockers.push("CANONICAL_STATE_INCONSISTENT");
  if (!duplicateAuthorityFree) blockers.push("DUPLICATE_AUTHORITY_DETECTED");
  if (!gaps.localEvidenceComplete) blockers.push("LOCAL_CONTROL_EVIDENCE_INCOMPLETE");
  if (!gaps.realWorldEvidenceComplete) blockers.push("REAL_WORLD_EVIDENCE_INCOMPLETE");
  blockers.push(...sandbox.blockers, ...FIXED_NO_GO);
  return decision(canonicalStateConsistent, duplicateAuthorityFree, gaps.localEvidenceComplete, gaps.realWorldEvidenceComplete, findings, blockers);
}

function decision(canonicalStateConsistent: boolean, duplicateAuthorityFree: boolean, localEvidenceComplete: boolean, realWorldEvidenceComplete: boolean, findings: LineConsolidationDecision["findings"], blockers: readonly string[]): LineConsolidationDecision {
  return Object.freeze({ decision: "NO-GO", lifecycle: "consolidation_review_candidate", canonicalStateConsistent, duplicateAuthorityFree, localEvidenceComplete, realWorldEvidenceComplete, findings: Object.freeze([...findings]), blockers: Object.freeze([...new Set(blockers)]), providerExecutionAuthorized: false, canaryExecutionAuthorized: false, providerSandboxEntryAuthorized: false, productionAuthority: false, networkExecuted: false });
}
