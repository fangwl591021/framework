# Eligibility and Invocation Boundaries

## ModuleEligibilityEvaluator

Navigation、Dashboard、Module management screen 與 read-only capability projection 只使用 Eligibility。它驗證 Trusted Tenant/Application、Application active、Catalog available、Entitlement validity、Enablement、Dependencies、active Membership 與 Permission。

Eligibility 是純讀取：不 claim Rate／Tenant／Concurrency budget、不建立 Circuit probe、Backpressure/Webhook receipt 或 Traffic evidence，也不執行 Domain operation。Navigation／Dashboard 以固定兩次查詢組裝，禁止逐項 Gate 與 N+1。

## ModuleInvocationGuard

真正 Command／Query 先呼叫 PR #20 admission stages，再執行 Eligibility：

1. Trusted Runtime Context
2. Signature／Identity evidence（適用時）
3. Webhook Deduplication（適用時）
4. Rate Limit
5. Tenant／Platform Resource Budget
6. Circuit Breaker
7. Load Shedding／Backpressure
8. Application lifecycle 與 Module Catalog／Entitlement／Enablement／Dependencies
9. Membership／Permission
10. Access version fence
11. Domain invocation

Admission 每次 invocation 只 claim 一次。Mutation 遇到 stale snapshot 直接拒絕；Read Query 可在同一 admission lease 內重新評估一次。Fence failure 會 idempotent release 可釋放的 budget；release/Observability sidecar failure 不覆蓋正式結果。

`ModuleAccessSnapshot` 保存 `applicationVersion`、`entitlementVersion`、`enablementVersion`、`evaluatedAt` 與 `accessFence`。Suspend、revoke、expire、disable 或 re-enable 都使舊 snapshot 失效。UI visibility 永遠不是授權證據。