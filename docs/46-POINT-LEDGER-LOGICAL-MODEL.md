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

- 每筆 Point Transaction 都是已成立並正式影響、抵消或調整點數資產的 Ledger Entry。
- 正式 Operation 包括 Grant、Deduct、Redeem、Expire、Reverse 與 Adjust；未來新增資產異動類型需通過 Contract 與 Architecture Review。
- 核心語意：Tenant、Account、Operation、Signed Amount、Business Reference、Rule Version、Idempotency Reference、Occurred Time、Ledger State、Original／Reversal Reference、Actor、Reason、Audit Reference。
- Ledger State 只描述已成立 Entry 的正式生命週期，不承載 Insufficient Balance、Permission Denied、Scope Violation 或其他失敗嘗試。
- 完成交易不可 Delete 或直接改 Amount；Reverse 建立正式反向 Ledger Entry，Adjust 建立正式授權差額 Ledger Entry。

### Failed Point Intent

以下未成立 Intent 不得建立 Point Transaction Ledger Entry：

- Insufficient Balance
- Permission Denied
- Scope Violation
- Duplicate Conflict
- Expired Request
- Invalid State
- Validation Failure

失敗結果由 Idempotency Record 與安全 Command Result 保存，讓相同 Request 可回傳原結果或依 Contract 安全重試。需要安全、權限或高風險決策證據時保存最小必要 Audit Record；Application／Security Log 依觀測或事件用途保存，不取代 Idempotency Stored Result，也不得複製完整 Payload。

### Point Balance Projection

- 只作查詢加速，必須能由有效 Ledger Entry 重建並記錄 Projection Version／Watermark；Rejected／Failed Attempt 不參與 Balance。
- Projection 或 KV 與 Ledger 不一致時，以 D1 Ledger 為準並觸發 Reconciliation。
- 是否保存實體 Balance、如何鎖定與更新，留待 Physical Design 與競爭測試決定。

## Logical Constraints

| Constraint | 目的 |
| --- | --- |
| Account Tenant＝Membership Tenant＝Program Tenant | 防止跨 Tenant 資產污染 |
| Business Reference＋Operation＋Rule Version 具明確 Idempotency Boundary | 防止重複贈點／扣點 |
| Reverse 指向同 Tenant、同 Account 的有效 Original | 保留可追溯抵消 |
| Insufficient Balance 預設整筆 Reject | 不產生負餘額、部分成功或任何 Ledger Entry；保存安全 Stored Result |
| Completed Transaction 不可物理覆寫 | 保留財務與稽核歷史 |
| Cross-shop 行為必須符合 Program Policy | Shop Isolated 為預設 |

## Access Patterns

- 取得 Account 當前可用結果與 Projection Freshness。
- 依 Account、Occurred Time 與穩定 Cursor 列出 Ledger History。
- 依 Business Reference／Idempotency Reference 查找 Command Stored Result；失敗結果不從 Ledger 查詢。
- 依 Original Reference 查找 Reverse／Correction Chain。
- 依 Tenant／Program／Shop 執行 Reconciliation，但不得以 Analytics Query 直接修改 Ledger。

## Concurrency and Recovery Questions

以下必須在實作前以 ADR 或 Physical Design 決定：

- 同 Account 高競爭 Deduct 的序列化與唯一 Winner 策略。
- D1 Transaction 範圍、Processing Timeout 與失敗後 Reconciliation。
- Projection 更新與 Read-after-write 語意。
- Ledger 分頁、容量、Retention、Archive 與對帳頻率。

相關文件：[Point Engine Contract](34-POINT-ENGINE-CONTRACT.md)、[Idempotency Standard](40-IDEMPOTENCY-STANDARD.md)、[ADR-009](adr/ADR-009-REJECT-INSUFFICIENT-POINT-BALANCE.md)、[ADR-012](adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md)。
