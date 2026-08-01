import { LineProviderExecutionReadinessError, type LineCanaryDecision, type LineCanaryGateContext, type LineCanaryStage } from "./models";

const promotion = {
  disabled: ["disabled", "internal"],
  internal: ["internal", "limited", "paused"],
  limited: ["limited", "approved_for_canary", "paused"],
  paused: ["paused", "internal", "disabled"],
  approved_for_canary: ["approved_for_canary", "paused", "disabled"],
} as const satisfies Readonly<Record<LineCanaryStage, readonly LineCanaryStage[]>>;

export function evaluateLineCanaryGate(input: LineCanaryGateContext): LineCanaryDecision {
  const allowedStages: readonly LineCanaryStage[] = promotion[input.currentStage];
  if (!allowedStages.includes(input.requestedStage)) throw new LineProviderExecutionReadinessError("LINE_CANARY_TRANSITION_INVALID");
  if (input.regressionDetected) return Object.freeze({ allowed: true, resultingStage: "paused", reasonCode: "LINE_CANARY_REGRESSION_PAUSED", productionAuthority: false, networkExecuted: false });
  if (input.requestedStage === input.currentStage) return Object.freeze({ allowed: true, resultingStage: input.currentStage, reasonCode: "LINE_CANARY_STAGE_UNCHANGED", productionAuthority: false, networkExecuted: false });
  if (input.requestedStage === "paused" || input.requestedStage === "disabled") return Object.freeze({ allowed: true, resultingStage: input.requestedStage, reasonCode: "LINE_CANARY_SAFE_DEMOTION", productionAuthority: false, networkExecuted: false });
  if (!input.approvalsValid) return Object.freeze({ allowed: false, resultingStage: input.currentStage, reasonCode: "LINE_CANARY_APPROVALS_INVALID", productionAuthority: false, networkExecuted: false });
  if (!input.evidenceFresh) return Object.freeze({ allowed: false, resultingStage: input.currentStage, reasonCode: "LINE_CANARY_EVIDENCE_STALE", productionAuthority: false, networkExecuted: false });
  if (!input.killSwitchOperational) return Object.freeze({ allowed: false, resultingStage: input.currentStage, reasonCode: "LINE_CANARY_KILL_SWITCH_NOT_READY", productionAuthority: false, networkExecuted: false });
  if (!input.rollbackReady) return Object.freeze({ allowed: false, resultingStage: input.currentStage, reasonCode: "LINE_CANARY_ROLLBACK_NOT_READY", productionAuthority: false, networkExecuted: false });
  if (!input.budgetEligible) return Object.freeze({ allowed: false, resultingStage: input.currentStage, reasonCode: "LINE_CANARY_BUDGET_DENIED", productionAuthority: false, networkExecuted: false });
  return Object.freeze({ allowed: true, resultingStage: input.requestedStage, reasonCode: "LINE_CANARY_PROMOTION_ELIGIBLE", productionAuthority: false, networkExecuted: false });
}
