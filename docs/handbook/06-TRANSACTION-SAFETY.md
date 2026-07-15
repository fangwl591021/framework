# Transaction Safety

> Conceptual Summary · No Runtime、Schema、Queue 或 Distributed Transaction

## 安全構成

每個狀態改變都必須定義：Atomic Intent、Business Reference、Actor／Permission、Tenant／Shop Scope、Allowed State、Idempotency Key、Stored Result、Audit、Failure Taxonomy、Retry、Reverse／Correct／Adjust、Reconciliation／Compensation。正式標準見 [Transaction Safety Standard](../39-TRANSACTION-SAFETY-STANDARD.md)。

## Point Grant 範例

```text
Attendance Confirmed
→ Application evaluates Point Rule
→ GrantPoints Command
→ Validate Tenant and Account
→ Claim Idempotency
→ Create Point Ledger Entry
→ Update Rebuildable Projection
→ Save Stored Result
→ Publish Event
```

Attendance 與 Point 是不同 Transaction Boundary。Attendance 只發布已確認事實；Application／Rule 形成 Grant Command；Point Engine 才擁有 Ledger。若 Point 失敗，Attendance 不回滾。

## 失敗範例

```text
Insufficient Balance
→ Reject
→ No Point Ledger Entry
→ Save Stored Result
→ Optional Audit
```

同 Key、同有效 Request 回原 Stored Result；同 Key、不同有效 Request 是 Conflict，不執行第二個 Intent。詳見 [Idempotency Standard](../40-IDEMPOTENCY-STANDARD.md)。

## Correction 語意

| Operation | 使用時機 | 歷史處理 |
| --- | --- | --- |
| Cancel | Intent 尚未完成 | 保存取消狀態 |
| Reject | 驗證失敗、交易未成立 | 不建立成功 Domain／Ledger Record |
| Reverse | 已成立效果需抵消 | 建立反向 Record 並指向 Original |
| Correct | 歷史判定需修正 | 建立新版本，保留 Old／New Evidence |
| Adjust | 授權處理一般交易無法表達的差額 | 保存 Case、Approval、Reason |

完成交易不得 Delete；正式規則見 [Correction／Reversal Standard](../41-CORRECTION-REVERSAL-STANDARD.md) 與 [ADR-012](../adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md)。

## 跨 Module Failure

```text
Notification Failure
does not rollback
Core Transaction
```

跨 Module 不假設分散式 Transaction。依賴失敗使用同 Key Retry、Stored Result Query、Domain Event、Reconciliation 與 Compensation；不得因 timeout 盲目建立新 Command。案例見 [20 個 Transaction Scenarios](../43-TRANSACTION-SCENARIO-MATRIX.md)。
