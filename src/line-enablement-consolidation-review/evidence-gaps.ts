import { LineConsolidationError, lineEvidenceCategories, type LineEvidenceCategory, type LineEvidenceGapClassification, type LineEvidenceRecord } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,99}$/;
export const localEvidenceCategories = Object.freeze(lineEvidenceCategories.slice(0, 16) as readonly LineEvidenceCategory[]);
export const realWorldEvidenceCategories = Object.freeze(lineEvidenceCategories.slice(16) as readonly LineEvidenceCategory[]);

export function classifyLineEvidenceGaps(records: readonly LineEvidenceRecord[], nowBucket: number): LineEvidenceGapClassification {
  if (!Number.isSafeInteger(nowBucket) || records.length > lineEvidenceCategories.length) throw new LineConsolidationError("LINE_CONSOLIDATION_EVIDENCE_INVALID");
  const byCategory = new Map<LineEvidenceCategory, LineEvidenceRecord>();
  for (const record of records) {
    const allowedKeys = ["category", "evidenceClass", "evidenceRef", "sourcePhase", "status", "verifiedAtBucket", "maximumAgeBuckets", "source"];
    const expectedClass = localEvidenceCategories.includes(record.category) ? "locally_completed_control" : "real_world_prerequisite";
    if (Object.keys(record).some((key) => !allowedKeys.includes(key)) || !lineEvidenceCategories.includes(record.category) || record.evidenceClass !== expectedClass || !referencePattern.test(record.evidenceRef) || !["verified", "missing", "expired", "not_started"].includes(record.status) || !Number.isSafeInteger(record.maximumAgeBuckets) || record.maximumAgeBuckets < 1 || record.maximumAgeBuckets > 24 * 365 || (record.verifiedAtBucket !== null && !Number.isSafeInteger(record.verifiedAtBucket)) || byCategory.has(record.category)) throw new LineConsolidationError("LINE_CONSOLIDATION_EVIDENCE_INVALID");
    if (record.evidenceClass === "locally_completed_control" && record.source !== "trusted_repository") throw new LineConsolidationError("LINE_CONSOLIDATION_EVIDENCE_INVALID");
    if (record.evidenceClass === "real_world_prerequisite" && record.source !== "trusted_governance") throw new LineConsolidationError("LINE_CONSOLIDATION_EVIDENCE_INVALID");
    byCategory.set(record.category, record);
  }
  const locallyCompletedControls: LineEvidenceCategory[] = [];
  const realWorldPrerequisites: LineEvidenceCategory[] = [];
  const staleEvidence: LineEvidenceCategory[] = [];
  const missingEvidence: LineEvidenceCategory[] = [];
  for (const category of lineEvidenceCategories) {
    const record = byCategory.get(category);
    if (!record || record.status === "missing" || record.status === "not_started") {
      missingEvidence.push(category);
      if (realWorldEvidenceCategories.includes(category)) realWorldPrerequisites.push(category);
      continue;
    }
    const stale = record.status === "expired" || record.verifiedAtBucket === null || record.verifiedAtBucket > nowBucket || nowBucket - record.verifiedAtBucket > record.maximumAgeBuckets;
    if (stale) {
      staleEvidence.push(category);
      if (realWorldEvidenceCategories.includes(category)) realWorldPrerequisites.push(category);
    } else if (localEvidenceCategories.includes(category)) locallyCompletedControls.push(category);
  }
  return Object.freeze({ locallyCompletedControls: Object.freeze(locallyCompletedControls), realWorldPrerequisites: Object.freeze([...new Set(realWorldPrerequisites)]), staleEvidence: Object.freeze(staleEvidence), missingEvidence: Object.freeze(missingEvidence), localEvidenceComplete: locallyCompletedControls.length === localEvidenceCategories.length, realWorldEvidenceComplete: realWorldPrerequisites.length === 0 && realWorldEvidenceCategories.every((category) => byCategory.get(category)?.status === "verified") });
}

export function localEvidenceRecord(category: LineEvidenceCategory, nowBucket: number): LineEvidenceRecord {
  if (!localEvidenceCategories.includes(category)) throw new LineConsolidationError("LINE_CONSOLIDATION_EVIDENCE_INVALID");
  const phase = category === "webhook_contract" || category === "signature_contract" || category === "reply_token_lifecycle" ? "adapter_enablement_readiness" : category === "signature_vectors" || category === "normalization_bounds" || category === "replay_dedup" || category === "fake_transport" ? "isolated_provider_verification" : category === "approval_snapshot" || category === "credential_reference_model" || category === "egress_policy_model" || category === "budget_quota_model" || category === "kill_switch_model" ? "provider_execution_readiness" : "canary_enablement_readiness";
  return Object.freeze({ category, evidenceClass: "locally_completed_control", evidenceRef: `evidence.local.${category}.v1`, sourcePhase: phase, status: "verified", verifiedAtBucket: nowBucket, maximumAgeBuckets: 24 * 30, source: "trusted_repository" });
}

export function pendingRealWorldEvidenceRecord(category: LineEvidenceCategory): LineEvidenceRecord {
  if (!realWorldEvidenceCategories.includes(category)) throw new LineConsolidationError("LINE_CONSOLIDATION_EVIDENCE_INVALID");
  return Object.freeze({ category, evidenceClass: "real_world_prerequisite", evidenceRef: `evidence.pending.${category}.v1`, sourcePhase: "external_governance", status: "not_started", verifiedAtBucket: null, maximumAgeBuckets: 24 * 30, source: "trusted_governance" });
}
