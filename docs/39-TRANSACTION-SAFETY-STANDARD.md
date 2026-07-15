# Transaction Safety Standard

> Conceptual Standard · No Runtime, Schema, Queue Consumer or Distributed Transaction

## Atomic Intent

每次狀態改變必須由單一明確 Intent 表達，例如 `Grant Points`、`Deduct Points`、`Confirm Attendance`、`Complete Redemption`、`Assign Attribution`、`Correct Referral`。一個 Command 不得暗中執行未揭露的跨領域交易。

## Business Reference

交易必須引用穩定業務來源：Attendance、Order、Campaign、Manual Adjustment、Referral、Redemption 或 Migration。External Provider Identity、畫面狀態、URL、Timestamp 不能單獨作 Business Reference。

## Pre-execution Scope Validation

依 Intent 驗證 Platform User、Tenant Membership、Tenant、Optional Brand／Shop、Actor、Permission、Target、Business Reference、Aggregate State、Policy Version。任何 Tenant 不一致都在寫入前拒絕，且回應不得洩漏其他 Tenant 資料存在性。

## Duplicate Protection

每個交易定義 Idempotency Key、Scope、Expiration／Retention、Stored Result、Conflict Behavior。高價值交易不得只依短期 KV Cache 防重；詳見 [Idempotency Standard](40-IDEMPOTENCY-STANDARD.md)。

## State Transition

- Command 只能由 Allowed State 進入明確 Resulting State。
- 成功、Reject、Cancel、Reverse、Correct、Adjust 都是不同結果。
- 不跳過 Identity、Permission、Confirmation、Availability 或 Eligibility Gate。
- 完成後不得 Delete；使用 [Correction and Reversal Standard](41-CORRECTION-REVERSAL-STANDARD.md)。

## Failure Taxonomy

| Category | Retry | Contract Meaning |
| --- | --- | --- |
| Validation Error | No | 輸入不符合 Contract |
| Authentication Error | No | Actor 未驗證 |
| Authorization Error | No | Permission 不足 |
| Scope Violation | No | Tenant／Shop 不一致 |
| Duplicate Request | Return stored result / Conflict | 已處理相同 Intent |
| Conflict | Usually No | 相同 Key 不同 Payload／State |
| Insufficient Balance | No | Default entire transaction rejected |
| Expired | No | Token／Window／Intent 到期 |
| Not Found | No | 不洩漏跨 Scope 存在性 |
| Invalid State | No | Transition 不允許 |
| Provider Error | Depends | 依 Provider 是否 transient |
| Temporary Failure | Yes, same key | 可重試且不得重複效果 |
| Permanent Failure | No | 保存明確失敗結果 |

不得把所有錯誤都回傳為一般 Internal Error，也不得在錯誤中暴露 Token、UID、PII 或其他 Tenant Reference。

## Cross-module Compensation

- 不假設 D1、Queue、Provider 或 Module 之間存在分散式 Transaction。
- 使用可重試 Command、Domain Event、明確 State 與 Compensation。
- Notification 失敗不回滾已成功的 Attendance、Point 或 Redemption。
- Point 成功但上游狀態未記錄時，不得盲目重送新 Command；先以 Business Reference／Stored Result Reconcile。
- 需要抵消時建立 Reverse／Correction，不 Delete。

## Security, Audit and Observability

- Backend 驗證 Actor、Permission、Tenant／Shop、Business Reference；Scanner、LIFF、URL、Client UI 不是安全邊界。
- Audit 保存 Intent、Actor、Decision、Rule Version、Before／After、Correlation、Original Reference；不保存 Secret／完整 PII。
- Metrics 至少涵蓋 Success、Permanent／Temporary Failure、Duplicate、Conflict、Scope Violation、Correction／Reverse、Dependency Failure。

## Contract Gate

每個交易 Command 必須在 Module Contract 聲明 Purpose、Actor、Permission、Tenant／Shop Scope、Business Reference、Idempotency、Allowed State、Success、Failure、Retry、Audit、Correction Path。缺一不得進入 Experimental。
