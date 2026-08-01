import type { CanaryPauseDecision, CanaryPauseSignals } from "./models";

export const canaryAutomaticPausePolicy = Object.freeze({
  policyVersion: 1,
  signatureFailureRateBasisPoints: 100,
  replayConflictRateBasisPoints: 50,
  provider429RateBasisPoints: 500,
  provider5xxRateBasisPoints: 200,
  costUsageBasisPoints: 9_000,
  latencyP95Ms: 2_000,
  serverOwned: true,
} as const);

export function evaluateCanaryAutomaticPause(signals: CanaryPauseSignals): CanaryPauseDecision {
  const numericValues = [signals.signatureFailureRateBasisPoints, signals.replayConflictRateBasisPoints, signals.provider429RateBasisPoints, signals.provider5xxRateBasisPoints, signals.costUsageBasisPoints, signals.latencyP95Ms];
  const reasons: string[] = [];
  if (numericValues.some((value) => !Number.isSafeInteger(value) || value < 0)) reasons.push("LINE_CANARY_SIGNAL_INVALID");
  if (signals.killSwitchActive) reasons.push("LINE_CANARY_KILL_SWITCH_ACTIVE");
  if (signals.credentialRevoked) reasons.push("LINE_CANARY_CREDENTIAL_REVOKED");
  if (signals.approvalRevoked) reasons.push("LINE_CANARY_APPROVAL_REVOKED");
  if (signals.evidenceFailure) reasons.push("LINE_CANARY_EVIDENCE_FAILURE");
  if (signals.signatureFailureRateBasisPoints >= canaryAutomaticPausePolicy.signatureFailureRateBasisPoints) reasons.push("LINE_CANARY_SIGNATURE_FAILURE_SPIKE");
  if (signals.replayConflictRateBasisPoints >= canaryAutomaticPausePolicy.replayConflictRateBasisPoints) reasons.push("LINE_CANARY_REPLAY_CONFLICT_SPIKE");
  if (signals.provider429RateBasisPoints >= canaryAutomaticPausePolicy.provider429RateBasisPoints) reasons.push("LINE_CANARY_PROVIDER_429_SPIKE");
  if (signals.provider5xxRateBasisPoints >= canaryAutomaticPausePolicy.provider5xxRateBasisPoints) reasons.push("LINE_CANARY_PROVIDER_5XX_SPIKE");
  if (signals.costUsageBasisPoints >= canaryAutomaticPausePolicy.costUsageBasisPoints) reasons.push("LINE_CANARY_COST_THRESHOLD");
  if (signals.latencyP95Ms >= canaryAutomaticPausePolicy.latencyP95Ms) reasons.push("LINE_CANARY_LATENCY_THRESHOLD");
  return Object.freeze({ paused: reasons.length > 0, reasonCodes: Object.freeze(reasons), dispatchAllowed: false, canaryExecutionAuthorized: false, networkExecuted: false });
}

export function canaryKillSwitchDecision(active: boolean): Readonly<{ active: boolean; dispatchAllowed: false; reasonCode: string; evidenceFailureMayBlock: false; networkExecuted: false }> {
  return Object.freeze({ active, dispatchAllowed: false, reasonCode: active ? "LINE_CANARY_KILL_SWITCH_ACTIVE" : "LINE_CANARY_EXECUTION_NOT_AUTHORIZED", evidenceFailureMayBlock: false, networkExecuted: false });
}
