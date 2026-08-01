import { LineCanaryReadinessError, type CanaryExecutionPermit, type CanaryPermitDecision } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,79}$/;
const MAX_PERMIT_BUCKETS = 24;

export function evaluateCanaryExecutionPermit(
  permit: CanaryExecutionPermit,
  expected: Readonly<{
    nowBucket: number;
    providerAccountRef: string;
    environment: CanaryExecutionPermit["environment"];
    approvalSnapshotRef: string;
    credentialReferenceId: string;
    credentialVersion: number;
    egressPolicyVersion: number;
    budgetPolicyVersion: number;
    cohortPolicyVersion: number;
  }>,
): CanaryPermitDecision {
  const allowedKeys = ["permitVersion", "permitRef", "providerAccountRef", "environment", "approvalSnapshotRef", "credentialReferenceId", "credentialVersion", "egressPolicyVersion", "budgetPolicyVersion", "cohortPolicyVersion", "issuedAtBucket", "expiresAtBucket", "status", "source", "executable", "productionAuthority"];
  if (Object.keys(permit).some((key) => !allowedKeys.includes(key)) || permit.permitVersion !== 1 || !referencePattern.test(permit.permitRef) || !referencePattern.test(permit.providerAccountRef) || !referencePattern.test(permit.approvalSnapshotRef) || !referencePattern.test(permit.credentialReferenceId) || !["staging", "production"].includes(permit.environment) || !["candidate", "paused", "revoked", "expired"].includes(permit.status) || permit.source !== "trusted_governance" || permit.executable !== false || permit.productionAuthority !== false || !Number.isSafeInteger(permit.issuedAtBucket) || !Number.isSafeInteger(permit.expiresAtBucket) || permit.expiresAtBucket <= permit.issuedAtBucket || permit.expiresAtBucket - permit.issuedAtBucket > MAX_PERMIT_BUCKETS || [permit.credentialVersion, permit.egressPolicyVersion, permit.budgetPolicyVersion, permit.cohortPolicyVersion].some((value) => !Number.isSafeInteger(value) || value < 1)) {
    throw new LineCanaryReadinessError("LINE_CANARY_PERMIT_INVALID");
  }
  if (permit.status === "revoked") return deny("LINE_CANARY_PERMIT_REVOKED");
  if (permit.status === "paused") return deny("LINE_CANARY_PERMIT_PAUSED");
  if (permit.status === "expired" || expected.nowBucket < permit.issuedAtBucket || expected.nowBucket >= permit.expiresAtBucket) return deny("LINE_CANARY_PERMIT_EXPIRED");
  const matches = permit.providerAccountRef === expected.providerAccountRef
    && permit.environment === expected.environment
    && permit.approvalSnapshotRef === expected.approvalSnapshotRef
    && permit.credentialReferenceId === expected.credentialReferenceId
    && permit.credentialVersion === expected.credentialVersion
    && permit.egressPolicyVersion === expected.egressPolicyVersion
    && permit.budgetPolicyVersion === expected.budgetPolicyVersion
    && permit.cohortPolicyVersion === expected.cohortPolicyVersion;
  return matches ? decision(true, "LINE_CANARY_PERMIT_CANDIDATE") : deny("LINE_CANARY_PERMIT_BINDING_MISMATCH");
}

function deny(reasonCode: string): CanaryPermitDecision {
  return decision(false, reasonCode);
}

function decision(candidateEligible: boolean, reasonCode: string): CanaryPermitDecision {
  return Object.freeze({ candidateEligible, reasonCode, maximumState: "canary_readiness_candidate", executable: false, productionAuthority: false, networkExecuted: false });
}
