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

概念資料包括 Tenant、Point Account、Type、Amount、Business Reference、Occurred At、Actor、Reason、Rule Version、Idempotency Key、Related Transaction、Status 與 Audit Reference；這不是 Schema。

## 不變條件

- D1 中的 Point Transaction Ledger 是帳務 Source of Truth；KV 不可作唯一 Account、Transaction 或 Balance 來源。
- Balance 必須由有效 Transaction 推導或以可重建投影加速，不得直接修改最終餘額。
- 同一 Idempotency Boundary 的重送不重複贈點或扣點。
- Reverse 建立反向 Transaction，不刪除原 Transaction。
- Adjust 需要高權限、Reason、Audit 與關聯證據。
- 所有 Command 驗證 Tenant、Program、Optional Shop、Membership 與 Permission Scope。
- 外部 Provider Identity 不能直接查找或修改 Point Account，必須先解析 Platform User 與 Tenant Membership。
- Point Rule 與 Point Ledger 分離；規則變更不得重算已完成歷史，除非有明確 Correction 流程。

## Scope 預設

- 不跨 Tenant。
- 未定義 Tenant Policy 時不跨 Shop 使用。
- Coupon、Tier、Referral 或 Commission 不因共用 Point Program 而自動共享。

相關決策見 [ADR-006](adr/ADR-006-TENANT-SCOPED-POINT-ACCOUNTS.md)。
