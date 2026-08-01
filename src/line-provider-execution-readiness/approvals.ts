import {
  LineProviderExecutionReadinessError,
  lineExecutionApprovalKinds,
  type LineExecutionApprovalKind,
  type LineExecutionApprovalRecord,
  type LineProviderAccountOwnership,
} from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,79}$/;

export function evaluateLineExecutionApprovals(
  records: readonly LineExecutionApprovalRecord[],
  input: Readonly<{ requiredScopeRef: string; now: number; source: "trusted_governance" | "client" }>,
): Readonly<{ valid: boolean; approvalRefs: readonly string[]; blockers: readonly string[] }> {
  if (input.source !== "trusted_governance") throw new LineProviderExecutionReadinessError("LINE_EXECUTION_APPROVAL_UNTRUSTED");
  if (!referencePattern.test(input.requiredScopeRef) || !Number.isSafeInteger(input.now)) throw new LineProviderExecutionReadinessError("LINE_EXECUTION_APPROVAL_INVALID");
  const blockers: string[] = [];
  const references: string[] = [];
  const byKind = new Map<LineExecutionApprovalKind, LineExecutionApprovalRecord>();
  const allowedKeys = ["approvalRef", "kind", "scopeRef", "status", "approverRole", "approvedAt", "expiresAt", "policyVersion", "source"];
  for (const record of records) {
    if (Object.keys(record).some((key) => !allowedKeys.includes(key)) || !lineExecutionApprovalKinds.includes(record.kind) || !referencePattern.test(record.approvalRef) || !referencePattern.test(record.scopeRef) || !referencePattern.test(record.approverRole) || !["approved", "revoked"].includes(record.status) || record.source !== "trusted_governance" || !Number.isSafeInteger(record.approvedAt) || !Number.isSafeInteger(record.expiresAt) || !Number.isSafeInteger(record.policyVersion) || record.policyVersion < 1 || record.approvedAt >= record.expiresAt || byKind.has(record.kind)) {
      throw new LineProviderExecutionReadinessError("LINE_EXECUTION_APPROVAL_INVALID");
    }
    byKind.set(record.kind, record);
  }
  for (const kind of lineExecutionApprovalKinds) {
    const record = byKind.get(kind);
    if (!record) {
      blockers.push(`APPROVAL_${kind.toUpperCase()}_MISSING`);
      continue;
    }
    references.push(record.approvalRef);
    if (record.status === "revoked") blockers.push(`APPROVAL_${kind.toUpperCase()}_REVOKED`);
    if (record.expiresAt <= input.now) blockers.push(`APPROVAL_${kind.toUpperCase()}_EXPIRED`);
    if (record.scopeRef !== input.requiredScopeRef) blockers.push(`APPROVAL_${kind.toUpperCase()}_SCOPE_MISMATCH`);
  }
  return Object.freeze({ valid: blockers.length === 0, approvalRefs: Object.freeze(references.sort()), blockers: Object.freeze(blockers) });
}

export function validateLineProviderAccountSeparation(
  staging: LineProviderAccountOwnership,
  production: LineProviderAccountOwnership,
): Readonly<{ valid: true; environmentSeparated: true }> {
  const valid = (value: LineProviderAccountOwnership): boolean => referencePattern.test(value.providerAccountRef)
    && referencePattern.test(value.ownerTeamRef)
    && referencePattern.test(value.operationsOwnerRef)
    && referencePattern.test(value.billingOwnerRef)
    && ["planned", "verified", "suspended"].includes(value.status)
    && value.clientOwned === false;
  if (!valid(staging) || !valid(production) || staging.environment !== "staging" || production.environment !== "production" || staging.providerAccountRef === production.providerAccountRef) {
    throw new LineProviderExecutionReadinessError("LINE_PROVIDER_ACCOUNT_INVALID");
  }
  return Object.freeze({ valid: true, environmentSeparated: true });
}
