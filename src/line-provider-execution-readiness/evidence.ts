import { LineProviderExecutionReadinessError, type LineExecutionReadinessDecision, type LineExecutionReadinessEvidence } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,79}$/;

export function buildLineExecutionReadinessEvidence(input: Readonly<{
  decision: LineExecutionReadinessDecision;
  approvalRefs: readonly string[];
  policyVersion: number;
  timestampBucket: string;
}>): LineExecutionReadinessEvidence {
  if (!Number.isSafeInteger(input.policyVersion) || input.policyVersion < 1 || !/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(input.timestampBucket) || input.approvalRefs.length > 6 || input.approvalRefs.some((value) => !referencePattern.test(value)) || input.decision.blockers.length > 40 || input.decision.blockers.some((value) => !/^[A-Z0-9_]{3,100}$/.test(value))) {
    throw new LineProviderExecutionReadinessError("LINE_EXECUTION_EVIDENCE_INVALID");
  }
  return Object.freeze({
    evidenceVersion: 1,
    lifecycle: "execution_readiness_candidate",
    decision: "NO-GO",
    controlsReady: input.decision.controlsReady,
    approvalRefs: Object.freeze([...input.approvalRefs].sort()),
    policyVersion: input.policyVersion,
    reasonCodes: Object.freeze([...input.decision.blockers]),
    timestampBucket: input.timestampBucket,
    realAdapter: "disabled",
    providerExecution: "not_authorized",
    networkExecuted: false,
  });
}
