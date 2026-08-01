import { LineCanaryReadinessError, canaryFreshnessKinds, type CanaryFreshnessDecision, type CanaryFreshnessEvidence, type CanaryFreshnessKind } from "./models";

export const canaryFreshnessPolicy = Object.freeze({ policyVersion: 1, maximumAgeBuckets: 24 * 30, serverOwned: true } as const);
const referencePattern = /^[a-z][a-z0-9_.:-]{2,79}$/;

export function evaluateCanaryEvidenceFreshness(records: readonly CanaryFreshnessEvidence[], nowBucket: number): CanaryFreshnessDecision {
  if (!Number.isSafeInteger(nowBucket) || records.length !== canaryFreshnessKinds.length) throw new LineCanaryReadinessError("LINE_CANARY_FRESHNESS_INVALID");
  const blockers: string[] = [];
  const byKind = new Map<CanaryFreshnessKind, CanaryFreshnessEvidence>();
  for (const record of records) {
    const allowedKeys = ["kind", "evidenceRef", "verifiedAtBucket", "policyVersion", "source"];
    if (Object.keys(record).some((key) => !allowedKeys.includes(key)) || !canaryFreshnessKinds.includes(record.kind) || !referencePattern.test(record.evidenceRef) || !Number.isSafeInteger(record.verifiedAtBucket) || !Number.isSafeInteger(record.policyVersion) || record.policyVersion < 1 || record.source !== "trusted_governance" || byKind.has(record.kind)) {
      throw new LineCanaryReadinessError("LINE_CANARY_FRESHNESS_INVALID");
    }
    byKind.set(record.kind, record);
  }
  for (const kind of canaryFreshnessKinds) {
    const record = byKind.get(kind);
    if (!record) blockers.push(`CANARY_${kind.toUpperCase()}_EVIDENCE_MISSING`);
    else if (record.verifiedAtBucket > nowBucket || nowBucket - record.verifiedAtBucket > canaryFreshnessPolicy.maximumAgeBuckets) blockers.push(`CANARY_${kind.toUpperCase()}_EVIDENCE_STALE`);
  }
  return Object.freeze({ fresh: blockers.length === 0, blockers: Object.freeze(blockers), serverWindowApplied: true });
}
