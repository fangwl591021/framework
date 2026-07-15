# Platform Mental Model

> 先理解關係，再理解功能

## 一個身份，多個業務關係

```text
一個 Platform User
→ 多個 Tenant Membership
→ 每個 Tenant 可有多個 Shop Membership
→ 各自擁有不同 Point、Referrer、Role、CRM
→ 可以使用相同登入入口
```

`Login Identity ≠ Platform User ≠ Tenant Membership ≠ Shop Membership`。登入識別是 Provider 提供的證明；Platform User 是平台主體；Membership 是主體在 Tenant／Shop 的業務關係。正式模型見 [ADR-001](../adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md) 與 [Identity／Membership Logical Model](../45-IDENTITY-MEMBERSHIP-LOGICAL-MODEL.md)。

## Referral、Share、Attribution、Commission

```text
Referral ≠ Share ≠ Attribution ≠ Commission
```

- Referral：Tenant 內長期、直接、單層的介紹關係。
- Share：內容或邀請的傳播入口。
- Attribution：特定 Conversion 的版本化證據判定。
- Commission：未來下游獎勵／支付能力，不屬於 Referral 或 Attribution 現有責任。

詳見 [Referral／Attribution Logical Model](../47-REFERRAL-ATTRIBUTION-LOGICAL-MODEL.md)。

## Point 的四個概念

```text
Point Rule ≠ Point Account ≠ Point Transaction ≠ Balance Projection
```

- Rule 決定是否與多少。
- Account 表示 Tenant Membership 在 Program／Scope 的資產帳戶。
- Transaction 是已成立的 Ledger Entry。
- Projection 是可由有效 Ledger 重建的查詢加速結果。

餘額不足只產生安全 Stored Result，不建立 Ledger Entry。詳見 [Point Ledger Logical Model](../46-POINT-LEDGER-LOGICAL-MODEL.md)。

## 跨 Module 不等於同一交易

`Attendance ≠ Point Grant`：Attendance 確認後，由 Application／Point Rule 決定是否送出 Grant Command。

`Redemption ≠ Point Ledger`：Redemption 擁有 Intent／Result；Point Engine 擁有扣點 Ledger。兩者以 Business Reference、Stored Result 與 Reconciliation 協作。

詳見 [Engine Integration Matrix](../42-ENGINE-INTEGRATION-MATRIX.md)。
