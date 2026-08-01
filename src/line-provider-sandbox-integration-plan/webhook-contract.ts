import { LineSandboxPlanError, type LineWebhookIngressContract } from "./models";

export const canonicalLineWebhookIngressContract: LineWebhookIngressContract = Object.freeze({
  contractVersion: 1,
  method: "POST",
  ingressMode: "contract_only",
  publicRouteCreated: false,
  rawBytesRequired: true,
  signatureRequired: true,
  replayProtectionRequired: true,
  maximumBodyBytes: 1_048_576,
  maximumEvents: 100,
  acceptedContentTypes: Object.freeze(["application/json"] as const),
  source: "trusted_repository",
});

export function validateLineWebhookIngressContract(contract: LineWebhookIngressContract): LineWebhookIngressContract {
  if (contract.publicRouteCreated !== false) throw new LineSandboxPlanError("PUBLIC_WEBHOOK_PROHIBITED");
  const keys = ["contractVersion", "method", "ingressMode", "publicRouteCreated", "rawBytesRequired", "signatureRequired", "replayProtectionRequired", "maximumBodyBytes", "maximumEvents", "acceptedContentTypes", "source"];
  if (Object.keys(contract).some((key) => !keys.includes(key)) || contract.contractVersion !== 1 || contract.method !== "POST" || contract.ingressMode !== "contract_only" ||
      contract.rawBytesRequired !== true || contract.signatureRequired !== true || contract.replayProtectionRequired !== true ||
      !Number.isSafeInteger(contract.maximumBodyBytes) || contract.maximumBodyBytes < 1 || contract.maximumBodyBytes > 1_048_576 ||
      !Number.isSafeInteger(contract.maximumEvents) || contract.maximumEvents < 1 || contract.maximumEvents > 100 ||
      contract.acceptedContentTypes.length !== 1 || contract.acceptedContentTypes[0] !== "application/json" || contract.source !== "trusted_repository") {
    throw new LineSandboxPlanError("WEBHOOK_CONTRACT_INVALID");
  }
  return Object.freeze({ ...contract, acceptedContentTypes: Object.freeze([...contract.acceptedContentTypes]) as readonly ["application/json"] });
}
