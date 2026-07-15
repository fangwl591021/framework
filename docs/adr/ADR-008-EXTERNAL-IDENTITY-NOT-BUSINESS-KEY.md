# ADR-008: Do Not Use External Provider Identity as the Business Primary Key

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
- 相關範圍：Identity、Membership、所有 Domain Module

## 背景

LINE UID、Google／Apple Subject、Email 或 Mobile 容易被專案直接用作會員、點數與推薦主鍵，導致 Provider 更換、帳號連結與跨 Tenant 隔離困難。

## 問題

需要一個不依賴單一 Provider、可安全連結多登入方式的 Business Reference。

## 限制條件

- Provider Identity 可能變更、撤銷、重複或有 Provider Scope。
- PII 不應散佈在 Domain Data。
- 本 ADR 不建立 Schema 或 Login API。

## 候選方案

1. 各 Domain 直接使用外部 Provider Identity。
2. Provider Identity 只進入 Identity Mapping，再解析 Platform User／Membership。
3. 使用 Email 或 Mobile 作全平台共同主鍵。

## 方案比較

| 方案 | 優點 | 缺點 | 主要風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| 直接用 Provider | 對接快速 | 強耦合 Provider | 換帳號即失聯 | 低 |
| Identity Mapping | 邊界穩定、支援多 Provider | 需要 Resolution 流程 | Merge 治理複雜 | 高 |
| Email/Mobile | 容易理解 | 可變、共享、PII | 錯誤自動合併 | 低 |

## 最終決策

LINE UID、Google Subject、Apple Subject、Facebook User ID、WhatsApp Identity、Email、Mobile 等 External Provider Identity 只存在 Identity Mapping Boundary。解析為 Platform User 後，再解析 Tenant Membership 或 Shop Membership；Domain Module 使用 Platform User、Tenant Membership 或自身 Module Entity ID 作穩定 Business Reference。Provider 變更不得造成 Point、Referral、Order 或 CRM 失聯，也不得以 `LINE UID + Shop ID` 取代完整身份與會員模型。

## 決策理由

此分離降低 Provider Lock-in、PII 擴散與跨 Tenant 污染，並提供 Account Linking、Conflict 與 Migration 的治理位置。

## 正面影響

- 一人可安全連結多 Provider。
- Provider 更換不需遷移所有 Domain Data。
- Permission 與 Membership 不由登入成功隱含取得。

## 負面影響

- 每個入口都必須先 Resolve Identity。
- Duplicate、Merge、Recovery 需要正式流程。

## 風險

- 實作者為求快速繞過 Identity Center。
- 相似 PII 被錯誤自動合併。

## 後續工作

- [ ] 建立 Identity Mapping Module Contract。
- [ ] 定義 Conflict、Merge、Split、Recovery 與 Audit。
- [ ] Legacy Migration 禁止沿用 Provider ID 作 Business Key。

## 重新檢討條件

- Provider 的法規或技術限制禁止必要 Mapping。
- Platform User 概念被正式證明無法滿足多主體模型。

## 相關文件

- [Identity Mapping Model](../24-IDENTITY-MAPPING-MODEL.md)
- [Duplicate, Merge and Migration](../32-DUPLICATE-MERGE-MIGRATION.md)
