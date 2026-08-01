import { LineProviderExecutionReadinessError, type LineRollbackDecision } from "./models";

const rollbackRoles = Object.freeze(["platform_operator", "incident_commander", "release_manager"] as const);

export function evaluateLineRollback(input: Readonly<{
  actorRole: string;
  planValidated: boolean;
  providerIndependent: boolean;
  currentSecretStatus: "planned" | "provisioned" | "active" | "rotating" | "expired" | "revoked" | "unknown";
}>): LineRollbackDecision {
  if (!(rollbackRoles as readonly string[]).includes(input.actorRole)) throw new LineProviderExecutionReadinessError("LINE_ROLLBACK_AUTHORITY_INVALID");
  if (!input.planValidated || !input.providerIndependent) return Object.freeze({ allowed: false, resultingAdapterState: "disabled", secretState: input.currentSecretStatus === "revoked" ? "remains_revoked" : "unchanged", reasonCode: "LINE_ROLLBACK_PLAN_NOT_READY", providerDependencyRequired: false, networkExecuted: false });
  return Object.freeze({ allowed: true, resultingAdapterState: "disabled", secretState: input.currentSecretStatus === "revoked" ? "remains_revoked" : "unchanged", reasonCode: "LINE_ROLLBACK_TO_DISABLED", providerDependencyRequired: false, networkExecuted: false });
}
