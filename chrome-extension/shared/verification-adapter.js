import { PLATFORM_ENDPOINT_CONFIGURATION, PlatformEndpointReasonCode, assertConfiguredPlatformOrigin, resolvePlatformEndpoints } from "./platform-endpoints.js";

export class VerificationAdapterError extends Error {
  constructor(reasonCode) { super(reasonCode); this.name = "VerificationAdapterError"; this.reasonCode = reasonCode; }
}

function assertExpectedEndpoint(actual, expected) {
  if (expected === null) {
    if (actual !== null && actual !== undefined && actual !== "") throw new VerificationAdapterError(PlatformEndpointReasonCode.ENDPOINT_CAPABILITY_MISMATCH);
    return;
  }
  if (actual !== expected) throw new VerificationAdapterError(PlatformEndpointReasonCode.ENDPOINT_CAPABILITY_MISMATCH);
}

/** @typedef {{verify(input: object): Promise<object>}} IntegrationVerificationAdapter */
export class LocalIntegrationVerificationAdapter {
  constructor({ now = () => Date.now(), endpointConfiguration = PLATFORM_ENDPOINT_CONFIGURATION } = {}) {
    this.now = now;
    try { assertConfiguredPlatformOrigin(endpointConfiguration.platformOrigin, endpointConfiguration); }
    catch { throw new VerificationAdapterError(PlatformEndpointReasonCode.PLATFORM_ORIGIN_NOT_ALLOWED); }
    this.endpointConfiguration = endpointConfiguration;
    this.descriptor = Object.freeze({ adapterKey: "local_line_verification", networkUsed: false, productionAllowed: false });
  }

  async verify(input) {
    if (input?.credentialStorageStatus !== "securely_stored" || !input?.credentialReference?.startsWith("cred-") || !/^(?:line-[a-z0-9]{6,24}|oa-primary)$/.test(input?.bindingKey ?? "")) throw new VerificationAdapterError("VERIFICATION_REFERENCE_INVALID");
    const endpoints = resolvePlatformEndpoints(input.bindingKey, this.endpointConfiguration);
    assertExpectedEndpoint(input.callbackUrl, endpoints.callback.url);
    assertExpectedEndpoint(input.webhookUrl, endpoints.webhook.url);
    const loginVerification = endpoints.callback.status;
    const messagingVerification = input.bindingKey === "oa-primary" ? "verified" : "not_configured";
    const webhookVerification = endpoints.webhook.status;
    const overallStatus = [loginVerification, messagingVerification, webhookVerification].every((status) => status === "verified") ? "active" : "not_configured";
    const reasonCodes = [endpoints.callback.reasonCode, endpoints.webhook.reasonCode].filter(Boolean);
    return Object.freeze({ loginVerification, messagingVerification, webhookVerification, overallStatus, verifiedAt: this.now(), reasonCode: reasonCodes[0] ?? null, reasonCodes: Object.freeze(reasonCodes) });
  }
}
