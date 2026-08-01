import { LineCanaryReadinessError, type CanaryBudgetDecision, type CanaryBudgetPolicy, type CanaryBudgetUsage } from "./models";

export const defaultCanaryBudgetPolicy: CanaryBudgetPolicy = Object.freeze({
  policyVersion: 1,
  maximumRequestsPerMinute: 10,
  maximumMessagesPerRequest: 1,
  dailyCostMinorUnits: 1_000,
  monthlyCostMinorUnits: 10_000,
  retryAttemptsPerRequest: 1,
  serverOwned: true,
});

export function evaluateCanaryBudget(
  usage: CanaryBudgetUsage,
  policy: CanaryBudgetPolicy = defaultCanaryBudgetPolicy,
  clientOverride: unknown = undefined,
): CanaryBudgetDecision {
  const policyValues = [policy.policyVersion, policy.maximumRequestsPerMinute, policy.maximumMessagesPerRequest, policy.dailyCostMinorUnits, policy.monthlyCostMinorUnits, policy.retryAttemptsPerRequest];
  const usageValues = [usage.requestsInCurrentMinute, usage.messageCount, usage.dailyCostMinorUnitsUsed, usage.monthlyCostMinorUnitsUsed, usage.estimatedRequestCostMinorUnits, usage.retryAttempts];
  if (policy.serverOwned !== true || policyValues.some((value) => !Number.isSafeInteger(value) || value < 0) || policy.policyVersion < 1 || policy.maximumRequestsPerMinute < 1 || policy.maximumMessagesPerRequest < 1 || policy.dailyCostMinorUnits < 1 || policy.monthlyCostMinorUnits < policy.dailyCostMinorUnits || usageValues.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new LineCanaryReadinessError("LINE_CANARY_BUDGET_INVALID");
  }
  if (clientOverride !== undefined) return decision(false, "LINE_CANARY_BUDGET_CLIENT_OVERRIDE_REJECTED", 0);
  const retryRemaining = Math.max(0, policy.retryAttemptsPerRequest - usage.retryAttempts);
  if (!usage.costEvidenceFresh) return decision(false, "LINE_CANARY_COST_EVIDENCE_STALE", retryRemaining);
  if (usage.requestsInCurrentMinute >= policy.maximumRequestsPerMinute) return decision(false, "LINE_CANARY_REQUEST_BUDGET_EXHAUSTED", retryRemaining);
  if (usage.messageCount > policy.maximumMessagesPerRequest) return decision(false, "LINE_CANARY_MESSAGE_BUDGET_EXHAUSTED", retryRemaining);
  if (usage.dailyCostMinorUnitsUsed + usage.estimatedRequestCostMinorUnits > policy.dailyCostMinorUnits) return decision(false, "LINE_CANARY_DAILY_COST_EXHAUSTED", retryRemaining);
  if (usage.monthlyCostMinorUnitsUsed + usage.estimatedRequestCostMinorUnits > policy.monthlyCostMinorUnits) return decision(false, "LINE_CANARY_MONTHLY_COST_EXHAUSTED", retryRemaining);
  if (usage.retryAttempts > policy.retryAttemptsPerRequest) return decision(false, "LINE_CANARY_RETRY_BUDGET_EXHAUSTED", 0);
  return Object.freeze({ eligible: true, pauseRequired: false, reasonCode: "LINE_CANARY_BUDGET_ELIGIBLE", retryRemaining, clientOverrideAccepted: false, networkExecuted: false });
}

function decision(eligible: boolean, reasonCode: string, retryRemaining: number): CanaryBudgetDecision {
  return Object.freeze({ eligible, pauseRequired: true, reasonCode, retryRemaining, clientOverrideAccepted: false, networkExecuted: false });
}
