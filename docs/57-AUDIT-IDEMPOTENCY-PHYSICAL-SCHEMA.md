# Audit and Idempotency Physical Schema

> Proposal Only · Do Not Execute · Platform Core Candidates Remain Not Implemented

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

## `idempotency_records`

候選欄位：`id`、`scope_type`、optional `tenant_id`、`scope_key`、`operation`、`idempotency_key_hash`、`request_fingerprint`、`status`、`result_code`、`result_reference`、`safe_result_json`、`processing_owner`、`processing_generation`、`lease_expires_at`、started／completed／expires timestamps、`retry_count`、created／updated timestamps。

- Scope 明確分成 `platform` 與 `tenant`。`platform` 必須 `tenant_id IS NULL`；`tenant` 必須 `tenant_id IS NOT NULL`，由 CHECK 保證。
- `scope_key` 在 Tenant Scope 只是 Tenant 內的次級 namespace，不代表 Tenant Identity。Tenant 唯一性候選為 `tenant_id + scope_key + operation + idempotency_key_hash`；Platform 唯一性候選為 `scope_key + operation + idempotency_key_hash`。兩者使用不同 partial unique index，不共用模糊 namespace。
- `UNIQUE (tenant_id, id)` 提供一般 Tenant Domain Composite FK target。Attendance Attempt、Redemption Intent 仍以 `(tenant_id, idempotency_record_id)` 參照；Point Transaction 進一步以 Tenant＋Record＋`processing_generation`＋Completed Status Composite FK 綁定正式效果。Tenant A 不能引用 Tenant B，且非 NULL Tenant child 無法匹配 Platform record。
- Same key＋same fingerprint：Processing 回處理中；Completed／Failed Permanent／Conflict 回 Stored Result；Failed Retryable 只用相同 key重新 Claim。
- Same key＋different fingerprint：以 CAS 將結果標示 Conflict，不執行 Domain Effect。
- `processing_generation` 從 `1` 開始；首次 Claim 或 Lease Takeover 都必須以 compare-and-set 驗證目前 status／owner／generation／expiry。Takeover 成功必須遞增 generation並取得新 lease，不能沿用舊 generation。
- 所有 Completed、Failed、Conflict 與 Point Domain Commit 都必須帶 owner＋generation條件；stale owner 的 update count 必須為 `0`，且不得建立 Ledger 或覆寫 Stored Result。
- `processing` 必須具有 owner、未來 lease expiry，且 result／completed欄位為空；Retryable Takeover 進入新 generation時要清除舊安全結果並由 Audit保留歷史。terminal／retryable result必須具有 `result_code` 與 completed timestamp。Completed Result一經提交不可回到 Processing。
- Point Ledger 另以 `uq_point_transactions_idempotency_effect` 保證同一 Tenant Idempotency Record 最多一筆正式效果；該 Ledger FK 只能引用同 generation 的 Completed Record。
- `safe_result_json` 只允許安全、版本化、大小受限的回應摘要；完整 request／response payload、PII、token、secret 禁止保存。
- High-value completed result 的 retention 不得短於 dispute／reconciliation window；實際期間待 Tony／Security／Domain Owner 決定。

## Claim, Takeover and Unknown Outcome

```text
Absent → Processing(generation=1)
Processing(current owner) → Completed | Failed Retryable | Failed Permanent | Conflict
Processing(expired lease) → Processing(generation+1, new owner)
Failed Retryable → Processing(generation+1, new lease)
```

- Lease Takeover 只取得重新驗證與嘗試權，不代表前一個 transaction 未提交；新 Owner 必須先查 Stored Result 與 Domain Reference。
- Commit 成功但 response lost：相同 key讀取 Completed Stored Result；不得產生新 key。
- Claim 已建立但 Domain 尚未提交：同 generation owner可重試；過期後由新 generation接管，舊 owner所有提交必須失敗。
- Domain Effect 與 Completed Result 對 Point Command 必須在同一 D1 local transaction；不得留下「Ledger committed、Idempotency processing」的正常成功路徑。
- 無法證明 outcome 時標記 Unknown／Reconciliation Case，不自動重放高價值 Point Effect；以 Idempotency Unique、Ledger Reference、Account Version 與 Audit Evidence判定。

## `audit_records`

候選欄位：`id`、`scope_type`、optional tenant／brand／shop、actor type／reference、action、resource type／reference、decision、reason、policy version、before／after summary、correlation reference、occurred time、retention／security class、created time。

合法 Scope 組合由 CHECK 明確限制：

| Scope | `tenant_id` | `brand_id` | `shop_id` |
| --- | --- | --- | --- |
| Platform | NULL | NULL | NULL |
| Tenant | NOT NULL | NULL | NULL |
| Brand | NOT NULL | NOT NULL | NULL |
| Shop | NOT NULL | optional | NOT NULL |

- `brand_id IS NULL OR tenant_id IS NOT NULL` 與 `shop_id IS NULL OR tenant_id IS NOT NULL` 防止 nullable composite FK 跳過必要 Tenant。
- Brand／Shop 各自以 Tenant-aware Composite FK 驗證；若 Shop Audit 同時保存 Brand，另以 `(tenant_id, brand_id, shop_id)` FK 驗證 Shop 確實屬於該 Brand。Shop Audit 不保存 Brand 時，仍由 `(tenant_id, shop_id)` 保證 Tenant。
- Append-only；不保存 Secret、完整 PII、完整 Point Transaction 或完整 Command／Provider Payload。
- 高風險 export 本身要新增 Audit Record；一般 Tenant Operator 不得跨 Tenant 搜尋。
- Before／After 是最小必要摘要或 immutable reference，不是 Domain record copy。
- Tamper evidence、hash chain、WORM archive、encryption 與 legal hold 是未決 physical design。
- Audit 不能接管 Domain Transaction；Idempotency 不能成為 Point Ledger。

## Constraints and Access

Status 使用穩定 `TEXT + CHECK` 候選。Idempotency 與 Audit 的 Scope discriminator、合法 nullable 組合及 Tenant hierarchy 由 CHECK＋Composite FK 保證；actor／resource business reference 的實際存在與授權仍由 application validation。Index 只支援分離的 Platform／Tenant replay lookup 與 scoped time-range audit search，避免為 JSON／每個 action 建立 hot index。

SQL：[005-audit-idempotency.sql](schema/proposals/005-audit-idempotency.sql)。
