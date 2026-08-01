import { LineSandboxPlanError, type LineSandboxTransportContract } from "./models";

export const canonicalLineSandboxTransportContract: LineSandboxTransportContract = Object.freeze({
  contractVersion: 1,
  transportId: "line_sandbox_transport_plan",
  executionMode: "fake_only",
  networkEnabled: false,
  runtimeComposed: false,
  providerExecutionAuthorized: false,
  boundedRequestBytes: 262_144,
  boundedResponseBytes: 262_144,
  source: "trusted_repository",
});

export function validateLineSandboxTransportContract(contract: LineSandboxTransportContract): LineSandboxTransportContract {
  if (contract.executionMode !== "fake_only" || contract.networkEnabled !== false || contract.runtimeComposed !== false || contract.providerExecutionAuthorized !== false) {
    throw new LineSandboxPlanError("TRANSPORT_NOT_FAKE_ONLY");
  }
  const keys = ["contractVersion", "transportId", "executionMode", "networkEnabled", "runtimeComposed", "providerExecutionAuthorized", "boundedRequestBytes", "boundedResponseBytes", "source"];
  if (Object.keys(contract).some((key) => !keys.includes(key)) || contract.contractVersion !== 1 || contract.transportId !== "line_sandbox_transport_plan" ||
      !Number.isSafeInteger(contract.boundedRequestBytes) || contract.boundedRequestBytes < 1 || contract.boundedRequestBytes > 262_144 ||
      !Number.isSafeInteger(contract.boundedResponseBytes) || contract.boundedResponseBytes < 1 || contract.boundedResponseBytes > 262_144 || contract.source !== "trusted_repository") {
    throw new LineSandboxPlanError("TRANSPORT_CONTRACT_INVALID");
  }
  return Object.freeze({ ...contract });
}
