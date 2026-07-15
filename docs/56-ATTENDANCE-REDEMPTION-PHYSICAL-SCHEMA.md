# Attendance and Redemption Physical Schema

> Proposal Only · Do Not Execute

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

## Event Reference Boundary

`events` 與 `event_sessions` 是 **Minimal Referenced Schema Candidate / Not Full Event Module Schema**。只保存 Attendance 所需 tenant、external business reference、title reference、session window、status；不接管 ticket、content、registration、pricing 或完整 Event lifecycle。

## Attendance

### `attendance_attempts`

保存驗證嘗試，包括 successful candidate、Failed Attempt、QR replay、location／keyword failure。候選欄位：tenant、event／session reference、membership、attempt type、status、reason code、evidence reference、idempotency record、attempted／created time、retention class、archived time。

- Location evidence 只保存最小 reference／classification，不無限制保存原始座標。
- Attempt 可保存失敗；它不是 Point Ledger，任何 failed attempt 不建立 Point Transaction。

### `attendance_records`

只保存正式 `confirmed`、`corrected`、`revoked` result；UNIQUE tenant＋session＋membership＋active marker 候選防重。Correction／revoke 建立歷史 chain，不 delete。Point Grant 是跨 Module Command，不強制同一 transaction。

## Redemption

### `redemption_intents`

保存 pending／confirmed／cancelled／expired intent：tenant、shop、membership、merchant actor、program、requested amount、token／confirmation reference、business reference、idempotency reference、status、expiry 與 audit reference。

### `redemption_results`

本 Proposal 決定 rejected 可以是 Result Record，用於穩定 business outcome；尚未完成或 validation failure 仍保留於 Intent／Idempotency。候選狀態：`completed`、`rejected`、`cancelled`、`reversed`、`corrected`。

保存 tenant／shop、intent、point transaction reference、requested／completed amount、merchant actor、member、original／reverse reference、receipt reference、reason、timestamps、audit reference。

- Point Transaction 只在 Point Engine 接受正式 Command 後建立；insufficient balance 不建立 Point row。
- Redemption Result 不複製 Point Ledger 真相；以 stable point transaction reference reconcile。
- Notification／receipt failure 不回滾已完成 core transaction。
- Merchant、member、shop、intent 必須同 Tenant；scanner／token 不授權。

## Open Decisions

Event reference table 是否保留、attendance active uniqueness、location retention、rejected result vs intent final state、receipt retention、dynamic token threshold 與 cross-database reconciliation 尚未批准。

SQL：[004-attendance-redemption.sql](schema/proposals/004-attendance-redemption.sql)。
