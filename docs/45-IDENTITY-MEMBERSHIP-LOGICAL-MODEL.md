# Identity and Membership Logical Model

> Logical Design Proposal · Not a Database Schema

## Boundary

本模型把「誰」、「在哪個 Tenant 有何關係」及「可做什麼」分開。Identity Center、Tenant Manager、Membership Engine 與 Permission Engine 各自擁有資料，不能以一張共用 User Record 混合。

## Logical Records

### Platform User

- Owner：Identity Center。
- 語意：跨 Provider 的平台主體。
- 核心內容：Internal Identity、Lifecycle、Created Source、Merge／Anonymization Reference、Audit Reference。
- 不包含：Tenant Tier、Point、Referral、Shop Role、Provider Token。

### Identity Mapping

- Owner：Identity Center。
- 語意：已驗證 Provider Subject 在特定 Provider Context 與 Platform User 的連結。
- 核心內容：Provider、Provider Context、Subject Reference、Verification State、Platform User Reference、Linked／Unlinked Time、Conflict State。
- 唯一性候選：同一有效 Provider Context＋Subject 同時只能連結一個有效 Platform User。
- PII／Provider Subject 的正規化、雜湊或加密屬 Physical Design，尚未決定。

### Tenant／Brand／Shop

- Owner：Tenant Manager。
- Tenant 是必要根節點；Brand／Shop 是選用子節點。
- 每個 Brand／Shop 必須可回溯同一 Tenant；組織節點停用不自動刪除 Membership 或 Transaction History。

### Tenant Membership

- Owner：Membership Engine。
- 關係：一個 Platform User 在一個 Tenant 的業務會員關係。
- 核心內容：Tenant、Platform User、Status、Join Source、Join Time、Tier Reference、Consent Reference、Lifecycle／Merge Reference。
- 唯一性候選：同一 Platform User＋Tenant 同時最多一個 Active Tenant Membership。
- 停用後保留 Point、Referral、Attribution、Attendance 與 Redemption 的歷史參考。

### Shop Membership

- Owner：Membership Engine。
- 關係：Tenant Membership 對同 Tenant Shop 的參與關係。
- 建立前必須存在相同 Tenant 的 Tenant Membership；Shop 停用或 Membership 停用後不可繼續授權新交易。
- 唯一性候選：同一 Tenant Membership＋Shop 同時最多一個有效 Shop Membership。

### Role Assignment

- Owner：Permission Engine。
- 核心內容：Subject Reference、Role Reference、Platform／Tenant／Brand／Shop／Own／Assigned Scope、Effective Period、Grant／Revoke Actor、Audit Reference。
- Assignment 不建立身份或會員；每次敏感 Command 仍需重新驗證目前有效 Scope。

## Relationship Validation

| 關係 | 必要驗證 | 拒絕情況 |
| --- | --- | --- |
| Identity Mapping → Platform User | Mapping 有效、Provider Context 正確 | 衝突、撤銷、指向不同 User |
| Tenant Membership → Tenant | Tenant 相同且可用 | Tenant 不存在或 Scope 不明 |
| Tenant Membership → Platform User | Platform User Lifecycle 允許 | Suspended／Merged 未完成解析 |
| Shop Membership → Shop | Shop 與 Membership Tenant 相同 | Cross-tenant、Shop 已停用 |
| Role Assignment → Subject | Subject 與 Scope 一致 | Tenant Role 指向其他 Tenant |

## Access Patterns

- 以已驗證 Provider Identity 解析 Platform User，再明確解析 Tenant Membership。
- 以 Tenant＋Platform User 查找目前 Membership，不從 Provider UID 直接查 Point 或 Role。
- 以 Tenant／Brand／Shop Scope 列出 Membership 或 Assignment，所有結果均需 Permission Filter。
- 查詢 Merge／Conflict／Lifecycle History 時遮罩 PII，並記錄高風險存取 Audit。

## Correction and Privacy

- Duplicate Candidate 不因 Email、Mobile 或姓名相似而自動 Merge。
- Merge／Split 使用 Case、Evidence、Requester、Approver、Before／After Reference，不覆寫成單一新 `user_id`。
- Erasure 優先採 Anonymization／Mapping Removal；不得破壞必要 Ledger、Audit 或 Tenant 歷史關聯。

相關文件：[Identity Mapping Model](24-IDENTITY-MAPPING-MODEL.md)、[Membership Model](25-MEMBERSHIP-MODEL.md)、[Role and Permission Scope](29-ROLE-PERMISSION-SCOPE.md)。
