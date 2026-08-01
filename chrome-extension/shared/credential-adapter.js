import { PLATFORM_ENDPOINT_CONFIGURATION, PlatformEndpointReasonCode, assertConfiguredPlatformOrigin, resolvePlatformEndpoints } from "./platform-endpoints.js";

export class CredentialAdapterError extends Error {
  constructor(reasonCode) { super(reasonCode); this.name = "CredentialAdapterError"; this.reasonCode = reasonCode; }
}

function stableReference(prefix, seed) {
  let hash = 5381;
  for (const character of seed) hash = ((hash << 5) + hash) ^ character.charCodeAt(0);
  return `${prefix}-${(hash >>> 0).toString(36).padStart(8, "0")}`;
}

export function validateCredentialInput(input) {
  const errors = [];
  const values = {
    lineLoginChannelSecret: typeof input?.lineLoginChannelSecret === "string" ? input.lineLoginChannelSecret : "",
    messagingChannelSecret: typeof input?.messagingChannelSecret === "string" ? input.messagingChannelSecret : "",
    channelAccessToken: typeof input?.channelAccessToken === "string" ? input.channelAccessToken : "",
  };
  if (values.lineLoginChannelSecret.length < 16 || values.lineLoginChannelSecret.length > 256) errors.push("LINE_LOGIN_SECRET_INVALID");
  if (values.messagingChannelSecret.length < 16 || values.messagingChannelSecret.length > 256) errors.push("MESSAGING_SECRET_INVALID");
  if (values.channelAccessToken.length < 20 || values.channelAccessToken.length > 2048) errors.push("CHANNEL_ACCESS_TOKEN_INVALID");
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}

/** @typedef {{register(input: object): Promise<object>}} CredentialRegistrationAdapter */
export class LocalCredentialRegistrationAdapter {
  constructor({ endpointConfiguration = PLATFORM_ENDPOINT_CONFIGURATION } = {}) {
    try { assertConfiguredPlatformOrigin(endpointConfiguration.platformOrigin, endpointConfiguration); }
    catch { throw new CredentialAdapterError(PlatformEndpointReasonCode.PLATFORM_ORIGIN_NOT_ALLOWED); }
    this.endpointConfiguration = endpointConfiguration;
    this.descriptor = Object.freeze({ adapterKey: "local_line_credential_reference", executionMode: "local_only", networkUsed: false, productionAllowed: false, credentialRegistrationCapability: endpointConfiguration.capabilities.credentialRegistration });
  }

  async register(input) {
    const validation = validateCredentialInput(input);
    if (!validation.ok) throw new CredentialAdapterError(validation.errors[0]);
    const publicSeed = `${input.workspaceRef}:${input.applicationRef}:${input.lineLoginChannelId}:${input.messagingChannelId}`;
    const bindingKey = stableReference("line", publicSeed).slice(0, 21);
    const endpoints = resolvePlatformEndpoints(bindingKey, this.endpointConfiguration);
    const reasonCodes = [endpoints.callback.reasonCode, endpoints.webhook.reasonCode, PlatformEndpointReasonCode.CREDENTIAL_REGISTRATION_NOT_CONFIGURED].filter(Boolean);
    return Object.freeze({
      credentialStorageStatus: this.endpointConfiguration.capabilities.credentialRegistration ? "not_configured" : "backend_unavailable",
      credentialReference: null,
      localValidationReference: stableReference("validation", publicSeed),
      bindingKey,
      callbackUrl: endpoints.callback.url,
      webhookUrl: endpoints.webhook.url,
      loginVerification: endpoints.callback.status,
      messagingVerification: "not_configured",
      webhookVerification: endpoints.webhook.status,
      overallStatus: "not_configured",
      reasonCode: reasonCodes[0],
      reasonCodes: Object.freeze(reasonCodes),
    });
  }
}

export function assertCredentialReceiptSafe(receipt) {
  const allowed = ["credentialStorageStatus", "credentialReference", "localValidationReference", "bindingKey", "callbackUrl", "webhookUrl", "loginVerification", "messagingVerification", "webhookVerification", "overallStatus", "reasonCode", "reasonCodes"];
  if (!receipt || Object.keys(receipt).length !== allowed.length || Object.keys(receipt).some((key) => !allowed.includes(key))) throw new CredentialAdapterError("CREDENTIAL_RECEIPT_UNSAFE");
  if (!Array.isArray(receipt.reasonCodes) || receipt.reasonCodes.length > 5) throw new CredentialAdapterError("CREDENTIAL_RECEIPT_UNSAFE");
  return true;
}
