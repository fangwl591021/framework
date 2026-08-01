import { LineProviderExecutionReadinessError, type LineCostQuotaDecision, type LineCostQuotaPolicy, type LineCostQuotaUsage } from "./models";

export const defaultLineCostQuotaPolicy: LineCostQuotaPolicy = Object.freeze({
  policyVersion: 1,
  hardRequestMinorUnits: 100,
  dailyMinorUnits: 10_000,
  monthlyMinorUnits: 200_000,
  requestsPerMinute: 60,
  messagesPerRequest: 5,
  retryAttemptsPerRequest: 1,
  serverOwned: true,
});

const integerFields = ["policyVersion", "hardRequestMinorUnits", "dailyMinorUnits", "monthlyMinorUnits", "requestsPerMinute", "messagesPerRequest", "retryAttemptsPerRequest"] as const;

function validPolicy(policy: LineCostQuotaPolicy): boolean {
  return policy.serverOwned === true
    && integerFields.every((key) => Number.isSafeInteger(policy[key]) && policy[key] >= 0)
    && policy.policyVersion >= 1
    && policy.hardRequestMinorUnits > 0
    && policy.dailyMinorUnits >= policy.hardRequestMinorUnits
    && policy.monthlyMinorUnits >= policy.dailyMinorUnits
    && policy.requestsPerMinute > 0
    && policy.messagesPerRequest > 0;
}

export function evaluateLineCostQuota(
  usage: LineCostQuotaUsage,
  policy: LineCostQuotaPolicy = defaultLineCostQuotaPolicy,
  clientLimitOverride: unknown = undefined,
): LineCostQuotaDecision {
  if (!validPolicy(policy) || Object.values(usage).some((value) => !Number.isSafeInteger(value) || value < 0)) throw new LineProviderExecutionReadinessError("LINE_COST_POLICY_INVALID");
  if (clientLimitOverride !== undefined) return Object.freeze({ eligible: false, reasonCode: "LINE_CLIENT_LIMIT_OVERRIDE_REJECTED", remainingRetryAttempts: 0, clientOverrideAccepted: false, networkExecuted: false });
  const remainingRetryAttempts = Math.max(0, policy.retryAttemptsPerRequest - usage.retryAttempts);
  if (usage.requestMinorUnits > policy.hardRequestMinorUnits) return Object.freeze({ eligible: false, reasonCode: "LINE_HARD_COST_CEILING_EXCEEDED", remainingRetryAttempts, clientOverrideAccepted: false, networkExecuted: false });
  if (usage.dailyMinorUnitsUsed + usage.requestMinorUnits > policy.dailyMinorUnits) return Object.freeze({ eligible: false, reasonCode: "LINE_DAILY_BUDGET_EXHAUSTED", remainingRetryAttempts, clientOverrideAccepted: false, networkExecuted: false });
  if (usage.monthlyMinorUnitsUsed + usage.requestMinorUnits > policy.monthlyMinorUnits) return Object.freeze({ eligible: false, reasonCode: "LINE_MONTHLY_BUDGET_EXHAUSTED", remainingRetryAttempts, clientOverrideAccepted: false, networkExecuted: false });
  if (usage.requestsInCurrentMinute >= policy.requestsPerMinute) return Object.freeze({ eligible: false, reasonCode: "LINE_REQUEST_RATE_EXHAUSTED", remainingRetryAttempts, clientOverrideAccepted: false, networkExecuted: false });
  if (usage.messageCount > policy.messagesPerRequest) return Object.freeze({ eligible: false, reasonCode: "LINE_MESSAGE_COUNT_EXCEEDED", remainingRetryAttempts, clientOverrideAccepted: false, networkExecuted: false });
  if (usage.retryAttempts > policy.retryAttemptsPerRequest) return Object.freeze({ eligible: false, reasonCode: "LINE_RETRY_BUDGET_EXHAUSTED", remainingRetryAttempts: 0, clientOverrideAccepted: false, networkExecuted: false });
  return Object.freeze({ eligible: true, reasonCode: "LINE_COST_QUOTA_POLICY_ELIGIBLE", remainingRetryAttempts, clientOverrideAccepted: false, networkExecuted: false });
}
