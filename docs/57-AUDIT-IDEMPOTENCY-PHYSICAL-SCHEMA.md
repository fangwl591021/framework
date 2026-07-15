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

候選欄位：`id`、optional `tenant_id`、`operation`、`idempotency_key_hash`、`request_fingerprint`、`status`、`result_code`、`result_reference`、`safe_result_json`、`processing_owner`、`lease_expires_at`、started／completed／expires timestamps、`retry_count`、created／updated timestamps。

- UNIQUE candidate：scope key＋operation＋key hash；platform scope 使用 explicit `scope_key`，不依 nullable tenant uniqueness。
- Same key＋same fingerprint：Processing 回處理中、Completed／Permanent Failure 回 Stored Result、Retryable Failure 依 Contract 重試。
- Same key＋different fingerprint：Conflict，不執行第二次。
- `safe_result_json` 只允許安全、版本化、大小受限的回應摘要；完整 request／response payload、PII、token、secret 禁止保存。
- High-value completed result 的 retention 不得短於 dispute／reconciliation window；實際期間待 Tony／Security／Domain Owner 決定。
- Processing timeout／lease takeover 需要 atomic claim proposal與故障測試，尚未實作。

## `audit_records`

候選欄位：`id`、optional tenant／brand／shop、actor type／reference、action、resource type／reference、decision、reason、policy version、before／after summary、correlation reference、occurred time、retention／security class、created time。

- Append-only；不保存 Secret、完整 PII、完整 Point Transaction 或完整 Command／Provider Payload。
- 高風險 export 本身要新增 Audit Record；一般 Tenant Operator 不得跨 Tenant 搜尋。
- Before／After 是最小必要摘要或 immutable reference，不是 Domain record copy。
- Tamper evidence、hash chain、WORM archive、encryption 與 legal hold 是未決 physical design。
- Audit 不能接管 Domain Transaction；Idempotency 不能成為 Point Ledger。

## Constraints and Access

Status 使用穩定 `TEXT + CHECK` 候選。Tenant／brand／shop hierarchy consistency 由 composite FK 或 transaction validation；platform-scope row 必須有明確 reason。Index 只支援 replay lookup 與 scoped time-range audit search，避免為 JSON／每個 action 建立 hot index。

SQL：[005-audit-idempotency.sql](schema/proposals/005-audit-idempotency.sql)。
