export const lineDashboardData = Object.freeze({
  summary: Object.freeze([
    Object.freeze({ label: "Live Worker", value: "Online", tone: "positive" }),
    Object.freeze({ label: "Binding", value: "oa-primary", tone: "neutral" }),
    Object.freeze({ label: "Webhook Verification", value: "Passed", tone: "positive" }),
    Object.freeze({ label: "Real Message Reply", value: "Passed", tone: "positive" }),
    Object.freeze({ label: "Platform Scope", value: "First OA Binding", tone: "scope" }),
  ]),
  hierarchy: Object.freeze(["Tenant", "Application", "Channel Binding", "LINE OA"]),
  bindings: Object.freeze([
    Object.freeze({
      bindingKey: "oa-primary",
      provider: "LINE Messaging API",
      environment: "Sandbox Live",
      status: "active",
      webhookUrl: "https://platform-core-line-sandbox-live.fangwl591021.workers.dev/webhook/oa-primary",
      credentialStorage: "Cloudflare Secrets",
      lastVerifiedResult: "Webhook + reply passed",
    }),
  ]),
  healthUrl: "https://platform-core-line-sandbox-live.fangwl591021.workers.dev/health",
  usageSteps: Object.freeze([
    "Open LINE OA",
    "Send a text message",
    "Receive “收到：<message>”",
  ]),
  completed: Object.freeze([
    "Real webhook connectivity",
    "HMAC signature verification",
    "Real reply API",
    "Isolated secret storage",
    "Route isolation",
  ]),
  limitations: Object.freeze([
    "Arbitrary OA onboarding",
    "Multi-binding registry",
    "Self-service credential setup",
    "Production rollout",
  ]),
  security: Object.freeze([
    "Secrets never displayed",
    "Unknown binding fails closed",
    "Invalid signature rejected",
    "No retry for reply token",
  ]),
});
