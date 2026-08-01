import type { LineSandboxEntryExitDecision, LineSandboxGateResult, LineSandboxPlanReasonCode, LineSandboxTestMatrixResult } from "./models";

const fixedBlockers: readonly LineSandboxPlanReasonCode[] = Object.freeze([
  "REAL_LINE_ADAPTER_DISABLED",
  "PROVIDER_EXECUTION_NOT_AUTHORIZED",
  "CANARY_EXECUTION_NOT_AUTHORIZED",
  "PROVIDER_SANDBOX_ENTRY_NOT_AUTHORIZED",
  "PROVIDER_SANDBOX_CONNECTIVITY_NOT_IMPLEMENTED",
  "PROVIDER_TRANSPORT_FAKE_ONLY",
  "CREDENTIALS_NOT_PROVISIONED",
  "PUBLIC_WEBHOOK_NOT_CREATED",
  "LINE_API_ACCESS_PROHIBITED",
  "REMOTE_D1_NOT_USED",
  "DEPLOYMENT_NOT_PERFORMED",
  "PRODUCTION_USE_NOT_ALLOWED",
]);

export function evaluateLineSandboxEntryExit(input?: Readonly<{
  testMatrix: LineSandboxTestMatrixResult;
  gates: LineSandboxGateResult;
  contractsValid: boolean;
  workbenchSoleAuthority: boolean;
}>): LineSandboxEntryExitDecision {
  if (!input) return decision(false, false, ["PLAN_INPUT_MISSING", ...fixedBlockers]);
  const reasonCodes: LineSandboxPlanReasonCode[] = [];
  if (!input.contractsValid) reasonCodes.push("TRANSPORT_CONTRACT_INVALID");
  if (!input.workbenchSoleAuthority) reasonCodes.push("WORKBENCH_AUTHORITY_NOT_PRESERVED");
  reasonCodes.push(...input.testMatrix.reasonCodes, ...input.gates.reasonCodes);
  if (!input.testMatrix.realWorldPrerequisitesComplete) reasonCodes.push("REAL_WORLD_EVIDENCE_INCOMPLETE");
  reasonCodes.push(...fixedBlockers);
  return decision(input.contractsValid && input.workbenchSoleAuthority && input.testMatrix.localControlsComplete, input.testMatrix.realWorldPrerequisitesComplete && input.gates.complete, reasonCodes);
}

function decision(localPlanComplete: boolean, realWorldPrerequisitesComplete: boolean, reasonCodes: readonly LineSandboxPlanReasonCode[]): LineSandboxEntryExitDecision {
  return Object.freeze({ entryDecision: "NO-GO", exitDecision: "NOT_ELIGIBLE", localPlanComplete, realWorldPrerequisitesComplete, reasonCodes: Object.freeze([...new Set(reasonCodes)].sort()), providerSandboxEntryAuthorized: false, providerExecutionAuthorized: false, canaryExecutionAuthorized: false, productionEntryPossible: false });
}
