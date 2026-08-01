import { realWorldEvidenceCategories } from "./evidence-gaps";
import type { LineEvidenceGapClassification, LineSandboxEntryDecision } from "./models";

const FIXED_SANDBOX_BLOCKERS = Object.freeze([
  "PROVIDER_SANDBOX_ENTRY_NOT_AUTHORIZED",
  "PROVIDER_EXECUTION_NOT_AUTHORIZED",
  "CANARY_EXECUTION_NOT_AUTHORIZED",
  "REAL_LINE_ADAPTER_DISABLED",
  "PROVIDER_TRANSPORT_FAKE_ONLY",
] as const);

export function decideLineProviderSandboxEntry(input?: Readonly<{
  evidence: LineEvidenceGapClassification;
  canonicalStateConsistent: boolean;
  duplicateAuthorityFree: boolean;
  workbenchSoleAuthority: boolean;
}>): LineSandboxEntryDecision {
  if (!input) return decision(false, ["SANDBOX_ENTRY_INPUT_MISSING", ...FIXED_SANDBOX_BLOCKERS]);
  const blockers: string[] = [];
  if (!input.canonicalStateConsistent) blockers.push("CANONICAL_STATE_INCONSISTENT");
  if (!input.duplicateAuthorityFree) blockers.push("DUPLICATE_AUTHORITY_DETECTED");
  if (!input.workbenchSoleAuthority) blockers.push("WORKBENCH_AUTHORITY_NOT_PRESERVED");
  if (!input.evidence.localEvidenceComplete) blockers.push("LOCAL_CONTROL_EVIDENCE_INCOMPLETE");
  for (const category of realWorldEvidenceCategories) if (input.evidence.realWorldPrerequisites.includes(category) || input.evidence.missingEvidence.includes(category) || input.evidence.staleEvidence.includes(category)) blockers.push(`REAL_WORLD_${category.toUpperCase()}_REQUIRED`);
  const criteriaComplete = blockers.length === 0 && input.evidence.realWorldEvidenceComplete;
  blockers.push(...FIXED_SANDBOX_BLOCKERS);
  return decision(criteriaComplete, blockers);
}

function decision(criteriaComplete: boolean, blockers: readonly string[]): LineSandboxEntryDecision {
  return Object.freeze({ decision: "NO-GO", lifecycle: "consolidation_review_candidate", criteriaComplete, blockers: Object.freeze([...new Set(blockers)]), providerSandboxEntryAuthorized: false, providerExecutionAuthorized: false, canaryExecutionAuthorized: false, productionAuthority: false, networkExecuted: false });
}
