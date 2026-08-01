import { LineCanaryReadinessError, canaryCohortKeys, type CanaryCohortDecision, type CanaryCohortPolicy } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,79}$/;

export const defaultCanaryCohortPolicy: CanaryCohortPolicy = Object.freeze({
  policyVersion: 1,
  tenantScopeRef: "tenant.canary.fixture",
  applicationScopeRef: "application.canary.fixture",
  cohortKey: "internal_operators",
  trafficBasisPoints: 25,
  hardTrafficCeilingBasisPoints: 100,
  maximumMessagesPerRequest: 1,
  serverOwned: true,
});

function bucketFor(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function evaluateCanaryCohort(
  input: Readonly<{ tenantScopeRef: string; applicationScopeRef: string; subjectDigestPrefix: string; messageCount: number; cohortKey: string }>,
  policy: CanaryCohortPolicy = defaultCanaryCohortPolicy,
  clientOverride: unknown = undefined,
): CanaryCohortDecision {
  if (policy.serverOwned !== true || !Number.isSafeInteger(policy.policyVersion) || policy.policyVersion < 1 || !referencePattern.test(policy.tenantScopeRef) || !referencePattern.test(policy.applicationScopeRef) || !canaryCohortKeys.includes(policy.cohortKey) || !Number.isSafeInteger(policy.trafficBasisPoints) || !Number.isSafeInteger(policy.hardTrafficCeilingBasisPoints) || policy.trafficBasisPoints < 0 || policy.hardTrafficCeilingBasisPoints < 0 || policy.hardTrafficCeilingBasisPoints > 10_000 || policy.trafficBasisPoints > policy.hardTrafficCeilingBasisPoints || !Number.isSafeInteger(policy.maximumMessagesPerRequest) || policy.maximumMessagesPerRequest < 1) {
    throw new LineCanaryReadinessError("LINE_CANARY_COHORT_INVALID");
  }
  if (clientOverride !== undefined) return decision(false, 0, "LINE_CANARY_COHORT_CLIENT_OVERRIDE_REJECTED");
  if (input.tenantScopeRef !== policy.tenantScopeRef || input.applicationScopeRef !== policy.applicationScopeRef) return decision(false, 0, "LINE_CANARY_COHORT_SCOPE_MISMATCH");
  if (!canaryCohortKeys.includes(input.cohortKey as typeof canaryCohortKeys[number])) return decision(false, 0, "LINE_CANARY_COHORT_UNKNOWN");
  if (input.cohortKey !== policy.cohortKey || !/^[0-9a-f]{8,16}$/.test(input.subjectDigestPrefix)) return decision(false, 0, "LINE_CANARY_COHORT_NOT_ELIGIBLE");
  if (!Number.isSafeInteger(input.messageCount) || input.messageCount < 0 || input.messageCount > policy.maximumMessagesPerRequest) return decision(false, 0, "LINE_CANARY_MESSAGE_CEILING_EXCEEDED");
  const cohortBucket = bucketFor(`${input.tenantScopeRef}:${input.applicationScopeRef}:${input.subjectDigestPrefix}:${input.cohortKey}`) % 10_000;
  return decision(cohortBucket < policy.trafficBasisPoints, cohortBucket, cohortBucket < policy.trafficBasisPoints ? "LINE_CANARY_COHORT_SELECTED" : "LINE_CANARY_TRAFFIC_CEILING_NOT_SELECTED");
}

function decision(eligible: boolean, cohortBucket: number, reasonCode: string): CanaryCohortDecision {
  return Object.freeze({ eligible, cohortBucket, reasonCode, clientOverrideAccepted: false, executable: false });
}
