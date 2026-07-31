# Security Boundary

- 非 localhost、mode 非 `enabled`、未知 `/local/*` route 一律 404。
- Production Worker 不引用 Demo entry 或 assets。
- UI 僅使用 `textContent`/DOM API，不使用 `innerHTML`。
- JSON body、深度、陣列、message 與 session TTL 均有界。
- Client 無權決定 Tenant、Application、Membership、Role 或 Permission。
- Event mutation 仍通過 Traffic、Module Eligibility、Permission、Access Fence、Audit、Idempotency。
- 回應遮蔽 fixture IDs；錯誤只回安全 code/support code，不回 stack、SQL、request body 或 key material。
- 無 Remote D1、Provider API、AI、LINE、LIFF、Telegram、Secret、Production Binding 或 Deployment。