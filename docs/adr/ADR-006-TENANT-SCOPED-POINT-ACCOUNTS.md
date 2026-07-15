# ADR-006: Scope Point Accounts to Tenant Membership

## 基本資料

- 狀態：Accepted
- 日期：2026-07-15
- 決策人：Tony
- Architecture Owner Approval：Accepted by Tony
- Approval Date：2026-07-15
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Supersedes：None
- Superseded By：None
- 相關範圍：Point、Membership、Tenant、Shop

## 背景

同一 Platform User 可加入多個 Tenant；若只以外部 UID 或 Platform User 保存總點數，會造成不同商家資產混合。

## 問題

需要明確 Point Account 的業務歸屬、跨 Shop 預設與帳務 Source of Truth。

## 限制條件

- Point 不得跨 Tenant。
- D1 Ledger 為 Source of Truth，KV 不得作唯一 Balance。
- 本 ADR 不建立 Schema。

## 候選方案

1. Platform User 全平台共用一個 Point Account。
2. Tenant Membership + Point Program + Optional Shop Scope 建立 Point Account。
3. 每個 Provider Identity 各自建立 Account。

## 方案比較

| 方案 | 優點 | 缺點 | 主要風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| 全平台共用 | 使用者視角簡單 | Tenant 資產混合 | 財務與隔離違規 | 低 |
| Tenant-scoped | 邊界清楚、可配置 Shop | Account 數量較多 | Policy 不一致 | 高 |
| Provider-scoped | 對接簡單 | 換 Provider 即分裂 | 重複與遺失 | 低 |

## 最終決策

Point Account 至少屬於 Tenant Membership，並以 Point Program 區分；可依 Shop Policy 進一步設定 Optional Shop Scope。不得建立沒有 Tenant Scope 的一般客戶 Point Account，不同 Tenant 點數預設不可互通。未有明確 Tenant Policy 時不跨 Shop。所有 Balance 變化都必須有 Point Transaction；Balance 由 Ledger 推導，不得直接更新。

## 決策理由

此模型保護 Tenant 資產與帳務邊界，也允許 Tenant 明確選擇跨 Shop Program。

## 正面影響

- Provider 更換不影響 Point Ownership。
- 可追蹤 Rule、Program、Account、Transaction。
- Cross-tenant negative test 明確。

## 負面影響

- 跨 Shop 查詢需要 Policy 與 Scope Resolution。
- Legacy Balance 需 Ledger Reconciliation。

## 風險

- Projection 被誤當 Source of Truth。
- Application 以 LINE UID 直接查帳戶。

## 後續工作

- [ ] 建立 Point Module Contract 與 Ledger Invariants。
- [ ] 定義 Tenant 的 Cross-shop Point Policy。
- [ ] 建立 Legacy Balance Migration Gap Analysis。

## 重新檢討條件

- 法規或正式商業模型要求跨 Tenant 共通資產，且取得新 ADR。
- D1 一致性或容量證據要求不同 Ledger 架構。

## 相關文件

- [Point Account Model](../26-POINT-ACCOUNT-MODEL.md)
- [Database Standard](../05-DATABASE-STANDARD.md)
