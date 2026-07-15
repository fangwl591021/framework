# Point Account Model

> **Conceptual Model / Not a Database Schema**

## 核心關係

```text
Tenant Membership + Point Program + Optional Shop Scope = Point Account
Point Account + Point Transaction Ledger = Derived Balance
```

Point Account 永遠屬於單一 Tenant，可選擇進一步綁定 Shop Scope。不同 Point Program 或 Point Kind 應保持可區分，不以一個無語意總額混合。

## 四個不同概念

| 概念 | 責任 |
| --- | --- |
| Point Rule | 定義 Eligibility、計算、期限與限制 |
| Point Program | 定義 Tenant 內的點數制度、種類與適用 Scope |
| Point Account | Membership 在 Program／Scope 下的帳戶 |
| Point Transaction | 不可任意覆寫的 Ledger 異動 |

## Point Transaction 類型

- Grant
- Deduct
- Redeem
- Expire
- Reverse
- Adjust
- Transfer（選用，需 Tenant Policy）
- Hold（選用）
- Release（選用）

概念資料包括 Tenant Scope、Optional Shop Scope、Point Account、Transaction Type、Amount、Reason、Source、Actor、Related Business Reference、Idempotency Key、Occurred At、Rule Version、Reversal Reference、Status 與 Audit Reference；這不是 Schema。

## 不變條件

- D1 中的 Point Transaction Ledger 是帳務 Source of Truth；KV 不可作唯一 Account、Transaction 或 Balance 來源。
- Balance 必須由有效 Transaction 推導或以可重建投影加速，不得直接修改最終餘額。
- 同一 Idempotency Boundary 的重送不重複贈點或扣點。
- 同一 Attendance／Check-in Business Reference 不得重複建立有效 Point Grant。
- Reverse 建立反向 Transaction，不刪除原 Transaction。
- Adjust 需要高權限、Reason、Audit 與關聯證據。
- 所有 Command 驗證 Tenant、Program、Optional Shop、Membership 與 Permission Scope。
- 外部 Provider Identity 不能直接查找或修改 Point Account，必須先解析 Platform User 與 Tenant Membership。
- Point Rule 與 Point Ledger 分離；規則變更不得重算已完成歷史，除非有明確 Correction 流程。
- Balance 不足時 Reject、部分扣除、Hold 或其他處理方式必須由版本化 Point Policy 定義，不得由 Handler 猜測。

## Scope 預設

- 不跨 Tenant。
- 未定義 Tenant Policy 時不跨 Shop 使用。
- Coupon、Tier、Referral 或 Commission 不因共用 Point Program 而自動共享。

相關決策見 [ADR-006](adr/ADR-006-TENANT-SCOPED-POINT-ACCOUNTS.md)。

## Sprint 5 Contract and Default Policy

- 正式候選 Contract：[Point Engine Contract](34-POINT-ENGINE-CONTRACT.md)。
- Cross-Shop Default：`Shop Isolated`；Tenant 可明確採 `Tenant Shared`；Selected Shop Group 只為未來候選。
- Insufficient Balance Default：整筆拒絕、不負餘額、不部分成功、不建立成功 Transaction；見 [ADR-009](adr/ADR-009-REJECT-INSUFFICIENT-POINT-BALANCE.md)。
- 完成交易以 Reverse／Correct，不 Delete；見 [ADR-012](adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md)。
