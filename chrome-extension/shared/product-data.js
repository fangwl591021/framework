export const consoleData = Object.freeze({
  product: Object.freeze({
    name: "LINE OA Platform Console",
    scope: "First OA Binding",
    notice: "One first binding is active. Arbitrary OA onboarding is not available yet.",
  }),
  tenant: Object.freeze({ key: "tenant-primary", name: "Platform Core Sandbox" }),
  applications: Object.freeze([
    Object.freeze({
      key: "line-operations",
      name: "LINE Operations",
      tenantKey: "tenant-primary",
      bindingKeys: Object.freeze(["oa-primary"]),
      hierarchy: Object.freeze(["Tenant", "Application", "Channel Binding", "LINE OA"]),
    }),
  ]),
  bindings: Object.freeze([
    Object.freeze({
      bindingKey: "oa-primary",
      tenantKey: "tenant-primary",
      applicationKey: "line-operations",
      provider: "LINE",
      environment: "Sandbox Live",
      status: "已連線",
      webhookVerification: "已通過",
      realReply: "已通過",
      webhookUrl: "https://platform-core-line-sandbox-live.fangwl591021.workers.dev/webhook/oa-primary",
      healthUrl: "https://platform-core-line-sandbox-live.fangwl591021.workers.dev/health",
      credentialStorage: "Cloudflare Secrets",
      lastVerification: "2026-08-01 · Webhook and reply passed",
      securityControls: Object.freeze([
        "Unknown binding fails closed",
        "Invalid signature is rejected",
        "Reply requests are never retried",
        "Credential values are never displayed",
      ]),
    }),
  ]),
  activity: Object.freeze([
    Object.freeze({ type: "received", label: "收到訊息", text: "測試", result: "Accepted" }),
    Object.freeze({ type: "replied", label: "完成回覆", text: "收到：測試", result: "Delivered" }),
  ]),
  auditEntries: Object.freeze([
    Object.freeze({ occurredAt: "2026-08-01 09:42", action: "Webhook verification", resource: "oa-primary", actor: "Platform", result: "Passed" }),
    Object.freeze({ occurredAt: "2026-08-01 09:41", action: "Message accepted", resource: "oa-primary", actor: "LINE Sandbox", result: "Completed" }),
    Object.freeze({ occurredAt: "2026-08-01 09:41", action: "Reply delivered", resource: "oa-primary", actor: "LINE Sandbox", result: "Completed" }),
  ]),

  completed: Object.freeze([
    "Real webhook connectivity",
    "HMAC signature verification",
    "Real reply API",
    "Isolated credential storage",
    "Binding route isolation",
  ]),
  limitations: Object.freeze([
    "Arbitrary OA onboarding",
    "Multi-binding registry",
    "Self-service credential setup",
    "Production rollout",
  ]),
});
