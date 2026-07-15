# ADR-004: Adopt an Optional Tenant–Brand–Shop Hierarchy

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
- 相關範圍：Tenant、Brand、Shop、Membership、Permission Scope

## 背景

Framework 需要同時支援單店、多店單品牌、多品牌企業與沒有實體 Shop 的組織。若強迫所有 Tenant 建立 Brand 或 Shop，會製造無意義層級；若沒有共通階層，又會讓 Point、CRM、Referral 與 Permission Scope 各自發明不同概念。

## 問題

需要一個保留 Tenant 資料隔離、又能選用 Brand 與 Shop 的一致組織模型。

## 限制條件

- Tenant 必須是主要資料隔離邊界。
- Brand 與 Shop 不得取代 Platform User 或 Tenant Membership。
- 不得強迫無需求的 Tenant 建立空 Brand 或 Shop。
- 本 ADR 不建立 Schema。

## 候選方案

1. 所有客戶固定使用 Tenant → Brand → Shop 三層。
2. Tenant 必要，Brand 與 Shop 選用。
3. 每個 Application 自行定義組織階層。

## 方案比較

| 方案 | 優點 | 缺點 | 主要風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| 固定三層 | 結構一致 | 單店與無店組織出現假層級 | 無意義資料與 Permission | 低 |
| 可選 Brand／Shop | 彈性且保留 Tenant Boundary | Query 與 Policy 需處理選用層級 | Scope 判斷較複雜 | 中高 |
| 各自定義 | 專案自由 | Framework 無共通語言 | 跨專案重用與權限混亂 | 低 |

## 最終決策

- Tenant 為必要層級。
- Brand 為選用層級。
- Shop 為選用層級。
- 單店客戶可使用 `Tenant → Shop`，不必建立 Brand。
- 無門市型 Tenant 不必建立 Shop。
- 多品牌企業可使用 `Tenant → Brand → Shop`。
- Brand 與 Shop 不得取代 Tenant 的資料隔離責任。
- Point 是否跨 Shop 使用，由 Tenant Policy 明確決定。
- Tenant 之間預設不共享 Point、Referral 或 CRM 資料。

## 決策理由

可選式階層能支援不同組織形態，同時以 Tenant 維持唯一且一致的資料隔離基準。

## 正面影響

- 單店、多品牌與無 Shop 組織使用相同語言。
- Permission、Point、CRM、Referral 與 Event 可明確標示 Scope。
- 不必建立沒有業務意義的 Brand 或 Shop。

## 負面影響

- Domain Module Contract 必須說明 Brand／Shop 是否適用。
- 跨 Shop Point 或 CRM View 需要額外 Tenant Policy。
- 組織節點移動或停用需處理 Permission 與歷史資料。

## 風險

- Application 將 Shop 誤作 Tenant，導致資料隔離錯誤。
- 不同 Module 對「跨 Shop」採用不一致預設值。
- LINE UID 被直接綁定 Shop 業務資料，跳過 Platform User 與 Tenant Membership。

## 後續工作

- [ ] 建立 Tenant、Brand、Shop、Tenant Membership 與 Shop Membership 概念模型。
- [ ] 每個 Domain Module 定義 Tenant、Brand 與 Shop Scope。
- [ ] 定義跨 Shop Point、CRM、Referral 與 Event Policy。
- [ ] 建立節點停用、移動、Audit Log 與 Permission Test Plan。

## 重新檢討條件

- 出現需要 Brand 以上或 Shop 以下的共通組織層級。
- 多國法人或資料區域無法只以 Tenant 表達隔離。
- 實際 Application 證明選用階層造成不可接受的複雜度。

## 相關文件

- [Organization Hierarchy](../22-ORGANIZATION-HIERARCHY.md)
- [Tenant Data Boundary](../15-TENANT-DATA-BOUNDARY.md)
- [Project Checklist](../09-PROJECT-CHECKLIST.md)
