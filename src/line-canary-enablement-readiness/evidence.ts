import { LineCanaryReadinessError, type CanaryAuditEvidence, type CanaryReadinessDecision } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,79}$/;

export function buildCanaryAuditEvidence(input: Readonly<{
  decision: CanaryReadinessDecision;
  permitRef: string;
  snapshotRef: string;
  egressPolicyVersion: number;
  budgetPolicyVersion: number;
  cohortPolicyVersion: number;
  timeBucket: number;
  cohortBucket: number;
}>): CanaryAuditEvidence {
  const versions = [input.egressPolicyVersion, input.budgetPolicyVersion, input.cohortPolicyVersion];
  if (!referencePattern.test(input.permitRef) || !referencePattern.test(input.snapshotRef) || versions.some((value) => !Number.isSafeInteger(value) || value < 1) || !Number.isSafeInteger(input.timeBucket) || !Number.isSafeInteger(input.cohortBucket) || input.cohortBucket < 0 || input.cohortBucket >= 10_000 || input.decision.blockers.length > 48 || input.decision.blockers.some((value) => !/^[A-Z0-9_]{3,100}$/.test(value))) {
    throw new LineCanaryReadinessError("LINE_CANARY_EVIDENCE_INVALID");
  }
  return Object.freeze({ evidenceVersion: 1, lifecycle: "canary_enablement_readiness_candidate", decision: "NO-GO", permitRef: input.permitRef, snapshotRef: input.snapshotRef, egressPolicyVersion: input.egressPolicyVersion, budgetPolicyVersion: input.budgetPolicyVersion, cohortPolicyVersion: input.cohortPolicyVersion, reasonCodes: Object.freeze([...input.decision.blockers]), timeBucket: input.timeBucket, cohortBucket: input.cohortBucket, providerExecutionAuthorized: false, canaryExecutionAuthorized: false, productionAuthority: false, networkExecuted: false });
}
