import { LineProviderExecutionReadinessError, type LineKillSwitchDecision } from "./models";

const killSwitchRoles = Object.freeze(["security_operator", "platform_operator", "incident_commander"] as const);

export function activateLineKillSwitch(input: Readonly<{
  actorRole: string;
  reasonCode: string;
  evidenceWriterAvailable: boolean;
}>): LineKillSwitchDecision {
  if (!(killSwitchRoles as readonly string[]).includes(input.actorRole) || !/^[A-Z0-9_]{3,80}$/.test(input.reasonCode)) throw new LineProviderExecutionReadinessError("LINE_KILL_SWITCH_AUTHORITY_INVALID");
  return Object.freeze({ active: true, dispatchAllowed: false, reasonCode: input.reasonCode, evidenceWriteRequired: true, evidenceFailureMayBlock: false, networkExecuted: false });
}

export function lineKillSwitchDispatchGuard(active: boolean): Readonly<{ dispatchAllowed: false; reasonCode: string; networkExecuted: false }> {
  return Object.freeze({ dispatchAllowed: false, reasonCode: active ? "LINE_KILL_SWITCH_ACTIVE" : "LINE_PROVIDER_EXECUTION_NOT_AUTHORIZED", networkExecuted: false });
}
