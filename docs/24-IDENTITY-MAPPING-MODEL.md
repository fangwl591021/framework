# Identity Mapping Model

> **Conceptual Model / Not a Database Schema**

Identity Mapping 隔離外部登入識別與平台、Tenant 業務身份。LINE UID、Google Subject、Apple Subject、Facebook Identity、WhatsApp Identity、WeChat Identity、Email 與 Mobile 都不得直接成為 Membership、Point、Referral 或 Attribution 的 Business Primary Key。

## 概念資料

以下只是語意需求，不是欄位定義：

- `provider`
- `provider_subject`
- `platform_user_id`
- `provider_tenant_context`
- `verification_status`
- `linked_at`
- `last_verified_at`
- `status`

`provider_tenant_context` 表示 Provider 自身的 Channel、App 或組織範圍，不等於 Platform Tenant。

## 連結流程

```text
Unverified
  → Provider Verified
  → Platform User Resolved
  → Identity Linked
  → Tenant Membership Resolved
```

- Provider Verified 只代表外部憑證通過。
- Platform User Resolved 可建立新 Platform User 或找出既有身份。
- Identity Linked 必須記錄驗證證據、Actor 與時間。
- Tenant Membership Resolved 是另一個 Module 的判定；登入成功不自動建立權限。

## 衝突處理

- 同一 Provider Subject 被連至不同 Platform User 時，標記衝突並停止自動連結。
- Email、Mobile、姓名相似、部分電話或公司相同，只能形成 Duplicate Candidate，不得自動 Merge。
- 已存在高風險 Identity Mapping、涉及多個 Tenant Membership 或 Point Account 時，必須人工審核。
- Provider Account 回收、Subject 變更或驗證撤銷時，停用 Mapping，不刪除稽核歷史。
- Merge 與 Split 依 [Duplicate, Merge and Migration](32-DUPLICATE-MERGE-MIGRATION.md) 處理。

## 安全與邊界

- Provider Token、Secret 與原始憑證不是 Identity Mapping 的業務識別。
- 查詢與稽核輸出應遮罩 Provider Subject 與 PII。
- Identity Center 只負責 Identity Mapping，不授予 Tenant Role、不修改 Point 或 Referral。
- 新增 Provider 只增加 Adapter 與驗證 Policy，不改變核心 Business Reference。

相關決策見 [ADR-008](adr/ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md)。
