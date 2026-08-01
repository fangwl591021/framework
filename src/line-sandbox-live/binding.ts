import type { LineBindingResolution, LineSandboxEnv } from "./models";

const PUBLIC_BINDING_KEY_PATTERN = /^[a-z][a-z0-9_-]{2,47}$/;

export function isValidPublicLineBindingKey(value: string | undefined): value is string {
  return typeof value === "string" && PUBLIC_BINDING_KEY_PATTERN.test(value);
}

export function resolveLineBinding(pathname: string, env: LineSandboxEnv): LineBindingResolution {
  const route = /^\/webhook\/([^/]+)$/.exec(pathname);
  const requestedBindingKey = route?.[1];
  const configuredBindingKey = env.LINE_BINDING_KEY;

  if (
    !isValidPublicLineBindingKey(requestedBindingKey)
    || !isValidPublicLineBindingKey(configuredBindingKey)
    || requestedBindingKey !== configuredBindingKey
  ) {
    return Object.freeze({ ok: false, status: 404, reasonCode: "WEBHOOK_BINDING_NOT_FOUND" });
  }

  if (!env.LINE_CHANNEL_SECRET || !env.LINE_CHANNEL_ACCESS_TOKEN) {
    return Object.freeze({ ok: false, status: 503, reasonCode: "WEBHOOK_CONFIG_MISSING" });
  }

  return Object.freeze({
    ok: true,
    binding: Object.freeze({
      bindingKey: configuredBindingKey,
      channelSecret: env.LINE_CHANNEL_SECRET,
      channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
      source: "trusted_environment" as const,
    }),
  });
}
