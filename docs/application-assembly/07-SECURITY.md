# Security

- 所有 SQL 參數化，禁止 `SELECT *`。
- Tenant-scoped Repository 不提供省略 `tenantId` 的便利方法。
- Platform Operator 與 Tenant Owner 權限分離；Tenant Owner 不可授予 purchased/trial entitlement 或註冊模組。
- Configuration 限制 8 KiB、6 層、200 nodes；Secret value 拒絕，只允許 Secret Reference。
- Audit 僅保存 action、resource reference、reason code，不保存完整 configuration。
- Traffic admission 必須在 Domain callback 前成功。
- Permission vocabulary 只能由 reviewed migration 經 [Module Permission Registration Gate](../runtime-phase-1/MODULE-PERMISSION-REGISTRATION-GATE.md) 註冊。
