import { LineCanaryReadinessError, canaryApprovalKinds, type CanaryApprovalKind, type CanaryApprovalRecord, type CanaryApprovalSnapshot, type CanaryEnvironment } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,79}$/;

export function createCanaryApprovalSnapshot(
  records: readonly CanaryApprovalRecord[],
  input: Readonly<{
    snapshotRef: string;
    scopeRef: string;
    environment: CanaryEnvironment;
    policyVersion: number;
    createdAtBucket: number;
    expiresAtBucket: number;
    source: "trusted_governance" | "client";
  }>,
): CanaryApprovalSnapshot {
  if (input.source !== "trusted_governance") throw new LineCanaryReadinessError("LINE_CANARY_APPROVAL_UNTRUSTED");
  if (!referencePattern.test(input.snapshotRef) || !referencePattern.test(input.scopeRef) || !["staging", "production"].includes(input.environment) || !Number.isSafeInteger(input.policyVersion) || input.policyVersion < 1 || !Number.isSafeInteger(input.createdAtBucket) || !Number.isSafeInteger(input.expiresAtBucket) || input.expiresAtBucket <= input.createdAtBucket || records.length > canaryApprovalKinds.length) {
    throw new LineCanaryReadinessError("LINE_CANARY_APPROVAL_INVALID");
  }
  const allowedKeys = ["approvalRef", "kind", "scopeRef", "status", "validFromBucket", "validUntilBucket", "source"];
  const byKind = new Map<CanaryApprovalKind, CanaryApprovalRecord>();
  for (const record of records) {
    if (Object.keys(record).some((key) => !allowedKeys.includes(key)) || !canaryApprovalKinds.includes(record.kind) || !referencePattern.test(record.approvalRef) || !referencePattern.test(record.scopeRef) || !["approved", "revoked"].includes(record.status) || record.source !== "trusted_governance" || !Number.isSafeInteger(record.validFromBucket) || !Number.isSafeInteger(record.validUntilBucket) || record.validUntilBucket <= record.validFromBucket || byKind.has(record.kind)) {
      throw new LineCanaryReadinessError("LINE_CANARY_APPROVAL_INVALID");
    }
    byKind.set(record.kind, record);
  }
  const approvals = Object.freeze(canaryApprovalKinds.flatMap((kind) => {
    const record = byKind.get(kind);
    return record ? [Object.freeze({ ...record })] : [];
  }));
  return Object.freeze({ snapshotVersion: 1, snapshotRef: input.snapshotRef, scopeRef: input.scopeRef, environment: input.environment, policyVersion: input.policyVersion, createdAtBucket: input.createdAtBucket, expiresAtBucket: input.expiresAtBucket, approvals, source: "trusted_governance" });
}

export function evaluateCanaryApprovalSnapshot(snapshot: CanaryApprovalSnapshot, nowBucket: number, requiredScopeRef: string): Readonly<{ candidate: boolean; blockers: readonly string[] }> {
  const blockers: string[] = [];
  if (snapshot.source !== "trusted_governance") blockers.push("APPROVAL_SNAPSHOT_UNTRUSTED");
  if (!Object.isFrozen(snapshot) || !Object.isFrozen(snapshot.approvals) || !snapshot.approvals.every(Object.isFrozen)) blockers.push("APPROVAL_SNAPSHOT_NOT_IMMUTABLE");
  if (!Number.isSafeInteger(nowBucket) || snapshot.scopeRef !== requiredScopeRef) blockers.push("APPROVAL_SNAPSHOT_SCOPE_MISMATCH");
  if (snapshot.expiresAtBucket <= nowBucket) blockers.push("APPROVAL_SNAPSHOT_EXPIRED");
  for (const kind of canaryApprovalKinds) {
    const record = snapshot.approvals.find((item) => item.kind === kind);
    if (!record) blockers.push(`APPROVAL_${kind.toUpperCase()}_MISSING`);
    else if (record.status === "revoked") blockers.push(`APPROVAL_${kind.toUpperCase()}_REVOKED`);
    else if (record.scopeRef !== requiredScopeRef) blockers.push(`APPROVAL_${kind.toUpperCase()}_SCOPE_MISMATCH`);
    else if (record.validFromBucket > nowBucket || record.validUntilBucket <= nowBucket) blockers.push(`APPROVAL_${kind.toUpperCase()}_EXPIRED`);
    else if (record.source !== "trusted_governance") blockers.push(`APPROVAL_${kind.toUpperCase()}_UNTRUSTED`);
  }
  return Object.freeze({ candidate: blockers.length === 0, blockers: Object.freeze(blockers) });
}
