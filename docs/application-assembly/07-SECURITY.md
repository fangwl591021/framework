# Security

- 所有 SQL 參數化，禁止 `SELECT *`。
- Tenant-scoped Repository 不提供省略 `tenantId` 的便利方法。
- Platform Operator 與 Tenant Owner 權限分離；Tenant Owner 不可授予 purchased/trial entitlement 或註冊模組。
- Configuration 限制 8 KiB、6 層、200 nodes；Secret value 拒絕，只允許 Secret Reference。
- Audit 僅保存 action、resource reference、reason code，不保存完整 configuration。
- Navigation/Dashboard 使用 side-effect-free Eligibility；UI visibility 不是授權證據。
- Domain Command/Query 先執行 PR #20 Traffic Admission stages，再檢查 Module/Permission 與 access fence。
- Stale snapshot 不得進入 Event 或 Business Network callback；Mutation 不自動重試。
- Admission claim 只發生一次，fence rejection idempotent release 可釋放的 budget，release failure 不改變已完成 Domain 結果。
- Observability failure 不影響正式 Eligibility、Invocation 或 Domain 結果。
- Permission vocabulary 只能由 reviewed migration 經 [Module Permission Registration Gate](../runtime-phase-1/MODULE-PERMISSION-REGISTRATION-GATE.md) 註冊。