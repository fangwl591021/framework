# ADR-001: Separate Platform User from Tenant Membership

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
- 相關範圍：Identity Center、Tenant Membership、Shop Membership

## 背景

同一自然人可能使用 LINE、Google、Apple 或其他 Provider 登入，也可能同時加入多個 Tenant。登入身份若直接承載 Point、Referral、CRM、會員等級與福利，會讓跨 Tenant 資料互相污染。

## 問題

需要一個能穩定表示自然人或平台主體、又不把 Tenant 業務資料提升為全平台資料的身份模型。

## 限制條件

- Tenant 是主要資料隔離邊界。
- 外部 Provider Identity 可能更換、合併或失效。
- 同一 Platform User 在不同 Tenant 的 Point、Referral、CRM 與福利必須獨立。
- 本 ADR 不建立 Schema 或 Migration。

## 候選方案

1. 每個 Tenant 直接使用 LINE UID 或其他 Provider ID 作會員主鍵。
2. 建立 Platform User，透過 Identity Mapping 連結 Provider，再建立 Tenant Membership。
3. 使用 `LINE UID + Shop ID` 等複合值代表自然人。

## 方案比較

| 方案 | 優點 | 缺點 | 主要風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| Provider ID 作主鍵 | 初期簡單 | 綁定通道，難以合併身份 | 跨 Tenant 污染與 Provider Lock-in | 低 |
| Platform User＋Tenant Membership | 身份與業務關係分離，可支援多 Provider | 需要明確 Mapping 與 Membership 邊界 | Migration 與重複身份合併複雜 | 中 |
| Provider ID＋Shop ID | 容易區分 Shop | 把登入與組織耦合，不能代表自然人 | 身份碎片化與 Shop 誤作 Tenant | 低 |

## 最終決策

- Platform User 代表自然人或平台主體。
- 外部登入身份透過 Identity Mapping 連結 Platform User。
- Point、Referral、CRM、會員等級與福利屬於 Tenant Membership 或 Tenant Domain。
- 同一 Platform User 可以加入多個 Tenant。
- 不得只用 LINE UID 作為跨 Tenant 業務主鍵。
- 不得用 `LINE UID + Shop ID` 取代 Platform User 模型。

## 決策理由

此模型同時保留跨 Provider 的身份連結能力，以及 Tenant 業務資料的明確隔離，並避免 Shop 或登入 Provider 成為平台身份真相。

## 正面影響

- 支援一人多 Provider、多 Tenant 與選用 Shop Membership。
- Point、Referral、CRM 與 Permission 可各自保留 Tenant Scope。
- Provider 更換不必重建 Tenant 業務關係。
- 降低 LINE UID 被誤用為全系統業務主鍵的風險。

## 負面影響

- Identity Mapping、帳號連結、合併與復原流程更複雜。
- 既有以 Provider ID 為主鍵的資料需要 Gap Analysis 與 Migration 設計。
- Duplicate Identity 與錯誤連結需要嚴格人工或政策處理。

## 風險

- 資料 Migration 可能把不同自然人錯誤合併，或把同一人拆成多個 Platform User。
- 既有 Point、Referral 或 CRM 資料可能缺少可信 Tenant Scope。
- Provider 提供的 Email 或 Mobile 不一定能安全作為自動合併依據。

## 後續工作

- [ ] 建立 Identity、Identity Mapping 與 Tenant Membership 概念模型。
- [ ] 定義帳號連結、解除、合併、復原與 Audit Log 規則。
- [ ] 對 Candidate Source 進行 Read-only Audit 與 Migration Gap Analysis。
- [ ] 建立 Tenant Boundary、Permission 與負面案例 Test Plan。

## 重新檢討條件

- 法規要求 Platform User 必須依國家或資料區域完全分離。
- 無法在可接受風險下完成身份 Mapping 或 Migration。
- 新的 Provider 或匿名身份模式無法由 Identity Mapping 表達。

## 相關文件

- [Identity Center](../06-IDENTITY-CENTER.md)
- [Tenant Data Boundary](../15-TENANT-DATA-BOUNDARY.md)
- [Organization Hierarchy](../22-ORGANIZATION-HIERARCHY.md)
