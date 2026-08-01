import type { CanaryDrillDecision } from "./models";

export function runCanaryProviderOutageDrill(input: Readonly<{ providerAvailable: boolean; killSwitchOperational: boolean; fallbackIsFakeOnly: boolean }>): CanaryDrillDecision {
  const passed = !input.providerAvailable && input.killSwitchOperational && input.fallbackIsFakeOnly;
  return Object.freeze({ passed, resultingAdapterState: "disabled", resultingTransport: "fake_only", reasonCode: passed ? "LINE_CANARY_OUTAGE_DRILL_PASSED" : "LINE_CANARY_OUTAGE_DRILL_FAILED", providerDependencyRequired: false, credentialDependencyRequired: false, mutationPerformed: false, networkExecuted: false });
}

export function runCanaryRedeliveryDrill(input: Readonly<{ firstFingerprint: string; replayFingerprint: string; providerEventIdStable: boolean }>): Readonly<{ passed: boolean; disposition: "replay" | "conflict" | "invalid"; duplicateMutationAllowed: false; reasonCode: string; networkExecuted: false }> {
  if (!/^[0-9a-f]{16,64}$/.test(input.firstFingerprint) || !/^[0-9a-f]{16,64}$/.test(input.replayFingerprint) || !input.providerEventIdStable) {
    return Object.freeze({ passed: false, disposition: "invalid", duplicateMutationAllowed: false, reasonCode: "LINE_CANARY_REDELIVERY_INVALID", networkExecuted: false });
  }
  const replay = input.firstFingerprint === input.replayFingerprint;
  return Object.freeze({ passed: replay, disposition: replay ? "replay" : "conflict", duplicateMutationAllowed: false, reasonCode: replay ? "LINE_CANARY_REDELIVERY_REPLAY_SAFE" : "LINE_CANARY_REDELIVERY_CONFLICT", networkExecuted: false });
}
