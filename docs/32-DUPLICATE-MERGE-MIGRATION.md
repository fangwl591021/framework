# Duplicate, Merge and Migration

> **Conceptual governance / Not a database migration**

## Duplicate Candidate 來源

- 同一 Provider Subject 出現不同 Platform User
- 經驗證 Email 或 Mobile 重複
- 使用者主動 Account Linking
- Legacy Import／Migration Mapping
- Admin 或客服回報

姓名相同、部分電話相同、相似 Email、公司相同或模糊文字比對，只能建立 Duplicate Candidate，不得自動 Merge。

## Merge 規則

1. 明確選定 Source Platform User 與 Target Platform User。
2. 保存 Evidence、Risk Classification、Actor、Approval、Time 與 Correlation。
3. Identity Mapping 可移至 Target，但衝突 Mapping 必須先解決。
4. 每個 Tenant Membership 逐 Tenant 判定；不得用 Source 覆寫 Target 的 Active Membership、Tier、Consent、CRM Labels 或 Role。
5. Point 不直接相加或改 Balance；需要移轉時建立可稽核的 Migration／Adjust／Transfer Transaction，保留原 Account 參考。
6. Referral Relationship 依 Tenant Policy 與人工判定保留、拒絕或 Correction，禁止形成 Self-referral 或 Cycle。
7. Attribution History 不合併成單一來源；必要時建立 Correction，保留原 Evidence 與 Policy Version。
8. Source 標記 Merged 並指向 Target；Merged Identity 不得再登入或建立新 Membership。

Merge 通常無法「完整 Rollback」：外部 Provider、下游 Event、已完成 Point／Order／Reward 可能已產生副作用。必須改用明確 Split／Correction 計畫，不可假設刪除 Merge Record 即復原。

## Split 風險

- 無法確定哪些歷史 Transaction、Referral、Attribution 或 Consent 屬於哪個人。
- 已發布 Event 或外部通知不可收回。
- Provider Identity 重新連結可能造成帳號接管。
- Point 與獎勵拆分可能需要財務與客服批准。

因此 Split 必須是高風險 Case，採人工證據審核、最小變更、雙重批准與完整 Audit。

## Legacy Migration Flow

```text
Read-only Inventory
  → Source Identity Classification
  → Duplicate Candidate Detection
  → Platform User Resolution
  → Identity Mapping Proposal
  → Tenant Membership Mapping
  → Shop Membership Mapping
  → Point Ledger Reconciliation
  → Referral Relationship Review
  → Attribution History Classification
  → Dry-run Validation
  → Authorized Migration
  → Reconciliation and Audit
```

## Migration 原則

- 原始 Legacy Identifier 只作 Migration Reference，不直接成為新 Business Key。
- Batch 與 Item 都需要 Idempotency Key、Result、Error 與重跑規則。
- 無法安全判定者進入 Manual Review，不猜測 Membership、Referrer 或 Attribution。
- 每次 Migration 定義 Source、Target、Tenant、Cutover、Rollback/Correction、Owner 與驗收數量。
- 本文件不授權讀取 Production Data，也不建立 Migration Script。
