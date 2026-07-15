# Attendance and Redemption Logical Model

> Logical Design Proposal · Transaction Records, Not Runtime

## Attendance Logical Records

### Attendance Subject

- Owner：Attendance Engine。
- 語意：Tenant 內可被簽到的 Event／Session／Venue／Campaign Reference 與有效時間、Optional Shop Scope、Verification Policy。
- Event 或 Content 本體仍由其 Owner Module 管理；Attendance 只保存穩定 Reference 與必要 Snapshot。

### Attendance Record

- 核心語意：Tenant、Subject Reference、Tenant Membership、Optional Shop、Method、Occurred Time、Verification Evidence Summary、Status、Business Reference、Idempotency Reference、Original／Correction Reference、Audit Reference。
- 唯一性候選由 Subject Policy 定義，例如每 Membership＋Session 一次有效 Confirmed Attendance。
- Confirmed、Rejected、Corrected、Revoked 是歷史狀態；不得以刪除 Record 取代 Revoke。
- Attendance 不直接寫 Point Ledger；只發布已確認事實或呼叫 Point 公開 Command。

## Redemption Logical Records

### Redemption Intent

- Owner：Redemption Engine。
- 核心語意：Tenant、Shop、Member Reference、Merchant Actor／Permission Decision Reference、Point Program、Requested Amount、Token／Confirmation Reference、Business Reference、Idempotency Reference、Status、Expiration、Audit Reference。
- Token 只解析候選 Intent，不授予 Merchant 權限；Server 必須重新驗證 Actor、Tenant、Shop 與 Member。

### Redemption Result

- 保存 Intent、Point Command Reference、Point Transaction Reference、Completed／Rejected／Cancelled／Reversed Result、Receipt Reference、Reason、Original／Correction Reference、Completed Time。
- Redemption 不複製 Point Ledger Amount 真相；跨 Module 結果以穩定 Reference 與 Stored Result 對帳。
- Notification／Receipt Adapter 失敗不改寫已完成 Redemption 或 Point 結果。

## Transaction Boundaries

| Intent | Local Consistency | Cross-module Coordination |
| --- | --- | --- |
| Confirm Attendance | Attendance 狀態＋Idempotency Result | Point Grant 以 Business Reference 防重 |
| Complete Redemption | Intent 狀態＋Stored Result | Point Deduct／Redeem Result Reconcile |
| Reverse Redemption | Reverse 狀態＋Original Reference | Point Reverse 使用同一 Original Business Chain |
| Correct Attendance | 新 Correction Version | 下游效果另行 Compensation，不覆寫 |

不假設 Attendance、Redemption、Point、Notification 或 Provider 之間存在分散式 Transaction。

## Logical Constraints

- Attendance／Redemption 的 Membership、Tenant、Shop 與 Subject／Intent Scope 必須一致。
- 重複請求回傳相同 Stored Result 或 Conflict，不重複確認、扣點或贈點。
- Merchant Role 撤銷後，未完成 Intent 不得沿用舊授權完成交易。
- Static／Dynamic QR、LIFF、Camera、URL Parameter 與 Client State 都不是安全邊界。
- 完成交易以 Reverse／Correct 處理，不 Delete。

## Access Patterns

- 依 Tenant＋Subject＋Membership 查詢 Attendance Result。
- 依 Business Reference／Idempotency Reference 查詢重送結果。
- 依 Tenant＋Shop＋時間列出授權範圍內的 Redemption。
- 依 Intent 查找 Point Result、Receipt 與 Reverse／Correction Chain。
- Reconciliation Query 必須可區分 Local Completed、Dependency Unknown、Dependency Completed 與 Permanent Failure。

相關文件：[Attendance Engine Contract](37-ATTENDANCE-ENGINE-CONTRACT.md)、[Redemption Engine Contract](38-REDEMPTION-ENGINE-CONTRACT.md)、[Transaction Safety](39-TRANSACTION-SAFETY-STANDARD.md)。
