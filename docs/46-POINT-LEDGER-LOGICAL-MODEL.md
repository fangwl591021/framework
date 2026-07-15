# Point Ledger Logical Model

> Logical Design Proposal · No SQL · No Balance Column Decision

## Aggregate Boundary

```text
Point Program + Tenant Membership + Optional Shop Scope
→ Point Account
→ Point Transaction Ledger
→ Derived Balance／Rebuildable Projection
```

Point Engine 擁有 Point Program、Point Account、Point Transaction 與其查詢投影。其他 Module 只能發出公開 Command 或查詢結果，不得直接建立 Ledger Record。

## Logical Records

### Point Program

- Tenant Scope 必要；Cross-shop Policy、Point Kind、Lifecycle 與 Rule Version 明確。
- Program 變更不回寫已完成 Transaction；歷史依建立時 Rule Version 解釋。

### Point Account

- 連結 Tenant Membership、Point Program 與選用 Shop Scope。
- 唯一性候選：相同 Tenant Membership＋Program＋有效 Scope 同時最多一個有效 Account。
- Account 狀態不等於 Balance；停用 Account 不刪除 Ledger。

### Point Transaction

- 每筆代表單一已接受或明確失敗的 Point Intent 結果。
- 核心語意：Tenant、Account、Operation、Signed Amount、Business Reference、Rule Version、Idempotency Reference、Occurred Time、Status、Original／Reversal Reference、Actor、Reason、Audit Reference。
- 完成交易不可 Delete 或直接改 Amount；Reverse 建立反向 Transaction，Adjust 建立授權差額 Transaction。

### Point Balance Projection

- 只作查詢加速，必須能由有效 Ledger 重建並記錄 Projection Version／Watermark。
- Projection 或 KV 與 Ledger 不一致時，以 D1 Ledger 為準並觸發 Reconciliation。
- 是否保存實體 Balance、如何鎖定與更新，留待 Physical Design 與競爭測試決定。

## Logical Constraints

| Constraint | 目的 |
| --- | --- |
| Account Tenant＝Membership Tenant＝Program Tenant | 防止跨 Tenant 資產污染 |
| Business Reference＋Operation＋Rule Version 具明確 Idempotency Boundary | 防止重複贈點／扣點 |
| Reverse 指向同 Tenant、同 Account 的有效 Original | 保留可追溯抵消 |
| Insufficient Balance 預設整筆 Reject | 不產生負餘額、部分成功或成功 Ledger |
| Completed Transaction 不可物理覆寫 | 保留財務與稽核歷史 |
| Cross-shop 行為必須符合 Program Policy | Shop Isolated 為預設 |

## Access Patterns

- 取得 Account 當前可用結果與 Projection Freshness。
- 依 Account、Occurred Time 與穩定 Cursor 列出 Ledger History。
- 依 Business Reference／Idempotency Reference 查找 Stored Result。
- 依 Original Reference 查找 Reverse／Correction Chain。
- 依 Tenant／Program／Shop 執行 Reconciliation，但不得以 Analytics Query 直接修改 Ledger。

## Concurrency and Recovery Questions

以下必須在實作前以 ADR 或 Physical Design 決定：

- 同 Account 高競爭 Deduct 的序列化與唯一 Winner 策略。
- D1 Transaction 範圍、Processing Timeout 與失敗後 Reconciliation。
- Projection 更新與 Read-after-write 語意。
- Ledger 分頁、容量、Retention、Archive 與對帳頻率。

相關文件：[Point Engine Contract](34-POINT-ENGINE-CONTRACT.md)、[Idempotency Standard](40-IDEMPOTENCY-STANDARD.md)、[ADR-009](adr/ADR-009-REJECT-INSUFFICIENT-POINT-BALANCE.md)、[ADR-012](adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md)。
