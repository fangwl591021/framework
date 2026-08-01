export const LIVE_PLATFORM_ORIGIN = "https://platform-core-line-sandbox-live.fangwl591021.workers.dev";

export const PlatformEndpointReasonCode = Object.freeze({
  CALLBACK_ENDPOINT_NOT_CONFIGURED: "CALLBACK_ENDPOINT_NOT_CONFIGURED",
  DYNAMIC_BINDING_PROVISIONING_NOT_CONFIGURED: "DYNAMIC_BINDING_PROVISIONING_NOT_CONFIGURED",
  CREDENTIAL_REGISTRATION_NOT_CONFIGURED: "CREDENTIAL_REGISTRATION_NOT_CONFIGURED",
  PLATFORM_ORIGIN_NOT_ALLOWED: "PLATFORM_ORIGIN_NOT_ALLOWED",
  ENDPOINT_CAPABILITY_MISMATCH: "ENDPOINT_CAPABILITY_MISMATCH",
});

export const IntegrationVerificationStatus = Object.freeze({
  CONFIGURED: "configured",
  VERIFIED: "verified",
  PENDING: "pending",
  FAILED: "failed",
  NOT_CONFIGURED: "not_configured",
});
export const PLATFORM_ENDPOINT_CONFIGURATION = Object.freeze({
  platformOrigin: LIVE_PLATFORM_ORIGIN,
  mode: "development",
  capabilities: Object.freeze({
    health: true,
    messagingWebhook: true,
    lineLoginCallback: false,
    credentialRegistration: false,
    dynamicBindingProvisioning: false,
  }),
  knownBindings: Object.freeze({
    "oa-primary": Object.freeze({
      webhookUrl: `${LIVE_PLATFORM_ORIGIN}/webhook/oa-primary`,
      webhookVerification: "verified",
    }),
  }),
});

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
}

export function validatePlatformOrigin(origin, { localTesting = false } = {}) {
  let url;
  try { url = new URL(origin); } catch { throw new Error(PlatformEndpointReasonCode.PLATFORM_ORIGIN_NOT_ALLOWED); }
  const hostname = url.hostname.toLowerCase();
  const local = hostname === "localhost" || hostname === "[::1]" || hostname === "::1" || hostname.endsWith(".local") || /^\[(?:fc|fd|fe[89ab])/i.test(hostname) || isPrivateIpv4(hostname);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error(PlatformEndpointReasonCode.PLATFORM_ORIGIN_NOT_ALLOWED);
  if (hostname.endsWith(".invalid") || hostname === "invalid" || (!localTesting && local) || (!localTesting && url.protocol !== "https:") || (localTesting && !["http:", "https:"].includes(url.protocol))) throw new Error(PlatformEndpointReasonCode.PLATFORM_ORIGIN_NOT_ALLOWED);
  return Object.freeze({ origin: url.origin, localTesting: local, copyableProductionUrl: !local && url.protocol === "https:" });
}

export function assertConfiguredPlatformOrigin(origin, configuration = PLATFORM_ENDPOINT_CONFIGURATION, options) {
  const validated = validatePlatformOrigin(origin, options);
  if (validated.origin !== configuration.platformOrigin || (!options?.localTesting && validated.origin !== LIVE_PLATFORM_ORIGIN)) throw new Error(PlatformEndpointReasonCode.PLATFORM_ORIGIN_NOT_ALLOWED);
  return validated;
}

export function resolvePlatformEndpoints(bindingKey, configuration = PLATFORM_ENDPOINT_CONFIGURATION) {
  assertConfiguredPlatformOrigin(configuration.platformOrigin, configuration);
  if (!/^(?:line-[a-z0-9]{6,24}|oa-primary)$/.test(bindingKey)) throw new Error("BINDING_KEY_INVALID");
  const known = configuration.knownBindings[bindingKey] ?? null;
  const callback = configuration.capabilities.lineLoginCallback
    ? Object.freeze({ url: null, status: "pending", reasonCode: PlatformEndpointReasonCode.ENDPOINT_CAPABILITY_MISMATCH })
    : Object.freeze({ url: null, status: "not_configured", reasonCode: PlatformEndpointReasonCode.CALLBACK_ENDPOINT_NOT_CONFIGURED });
  const webhook = known && configuration.capabilities.messagingWebhook
    ? Object.freeze({ url: known.webhookUrl, status: known.webhookVerification, reasonCode: null })
    : Object.freeze({ url: null, status: "not_configured", reasonCode: PlatformEndpointReasonCode.DYNAMIC_BINDING_PROVISIONING_NOT_CONFIGURED });
  return Object.freeze({ callback, webhook });
}
