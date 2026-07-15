# Domain Invariants

> **Conceptual Model / Not a Database Schema**

每項 Invariant 都是未來 Contract、實作與測試必須共同維護的規則；Suggested Enforcement Layer 只是設計方向，不代表 Runtime 已存在。

## Identity

| Invariant | Owner Module | Violation Risk | Suggested Enforcement Layer | Audit Requirement | Idempotency Requirement |
| --- | --- | --- | --- | --- | --- |
| External Identity 不得成為 Business Primary Key | Identity Center | Provider 更換造成資料遺失或污染 | Identity Resolution Contract | 連結與解除需 Audit | Link Command 需 Key |
| Platform User 不依賴單一 Provider 存在 | Identity Center | Provider 停用造成業務身份失聯 | Platform User Aggregate | Identity Lifecycle 需 Audit | Provider Event 需去重 |
| 同一 Provider Subject 不得同時 Active 連至多個 Platform User | Identity Center | 帳號接管 | Aggregate／唯一性 Guard | 衝突與人工決策需 Audit | 重送回傳原結果 |
| 高風險 Duplicate 不得自動 Merge | Identity Center | 不可逆身份混併 | Merge Policy／人工審核 | 完整 Evidence、Actor、Reason | Merge Request 唯一 Key |

## Membership

| Invariant | Owner Module | Violation Risk | Suggested Enforcement Layer | Audit Requirement | Idempotency Requirement |
| --- | --- | --- | --- | --- | --- |
| 同一 Platform User／Tenant 最多一個 Active Tenant Membership | Membership Engine | 重複 Point／Referral | Aggregate Guard | 建立、恢復、合併需 Audit | Join Command 需 Key |
| Shop Membership 必須有同 Tenant 的 Tenant Membership | Membership Engine | 孤兒關係與越權 | Command Validation | 建立與撤銷需 Audit | Assign Shop 需 Key |
| Membership 業務資料不得跨 Tenant 合併 | Membership Engine | Tenant 資料污染 | Tenant Boundary | Merge／Migration 需 Audit | Migration Batch／Item Key |

## Point

| Invariant | Owner Module | Violation Risk | Suggested Enforcement Layer | Audit Requirement | Idempotency Requirement |
| --- | --- | --- | --- | --- | --- |
| Balance 只能由 Ledger 推導，不得直接修改 | Point Engine | 帳務失真 | Aggregate／Projection | 所有異動具 Actor／Reason | 每筆 Command 需 Key |
| D1 Point Transaction Ledger 是 Source of Truth | Point Engine | Cache 漂移造成錯誤資產 | Repository／Consistency Boundary | Reconciliation 需 Audit | Ledger Write 需 Key |
| 相同 Attendance／Business Reference 不得重複贈點 | Point Engine | 重複資產 | Idempotency Boundary | 重送與 Stored Result 可追溯 | Business Reference + Rule Version |
| Reverse 必須指向原 Transaction 且不得刪除原紀錄 | Point Engine | 稽核歷史消失或無法對帳 | Transaction Contract | 原因與關聯 Transaction | Reverse Reference 唯一 |
| Point Account 不跨 Tenant，跨 Shop 須 Policy | Point Engine | 資產越界 | Scope Guard | 跨 Shop 使用需 Audit | Scope 納入 Key |
| Rule 變更不回寫已完成歷史 | Point Engine | 重算結果漂移 | Rule Version | Correction 需 Audit | Rule Version 納入 Boundary |

## Referral

| Invariant | Owner Module | Violation Risk | Suggested Enforcement Layer | Audit Requirement | Idempotency Requirement |
| --- | --- | --- | --- | --- | --- |
| 每 Membership 同時最多一個 Active Direct Referrer，預設單層 | Referral Engine | 獎勵衝突 | Aggregate Guard | 建立與變更需 Audit | Assign Command 需 Key |
| Tenant A 的 Referral 不得由 Tenant B 讀取或修改 | Referral Engine | Cross-tenant 污染 | Tenant Scope Guard | 邊界拒絕需 Audit | Tenant 納入 Key |
| 禁止 Self-referral 與 Cycle | Referral Engine | 詐欺與不一致 | Relationship Validation | 拒絕理由記錄 | 重送維持拒絕結果 |
| 一般分享不得覆寫既有 Referral | Referral Engine | 長期關係被行銷 Touch 改寫 | Referral Policy | Override 需高權限 Audit | Share Touch 自身去重 |

## Attribution

| Invariant | Owner Module | Violation Risk | Suggested Enforcement Layer | Audit Requirement | Idempotency Requirement |
| --- | --- | --- | --- | --- | --- |
| 每 Conversion 只能有一個目前 Active Attribution Record | Attribution Engine | 重複獎勵 | Aggregate Guard | 決策與修正需 Audit | Conversion + Policy Boundary |
| Attribution Correction／Reversal 必須保留原 Record 與歷史 | Attribution Engine | 歸因證據被覆寫 | Historical Correction Contract | Before／After／Reason | Correction Case Key |
| 無充分證據時不得猜測，使用 Unattributed | Attribution Engine | 錯誤歸因 | Decision Policy | 決策 Reason／Evidence | 重算同版本結果一致 |
| Attribution 不改寫 Referral 或直接產生 Commission | Attribution Engine | 邊界耦合 | Module Contract | 下游事件可追溯 | Published Event 需 ID |
| Window、Model、Eligibility 必須保存 Rule Version | Attribution Engine | 歷史不可重現 | Policy Versioning | 每次決策保存版本 | Version 納入 Key |

## Permission

| Invariant | Owner Module | Violation Risk | Suggested Enforcement Layer | Audit Requirement | Idempotency Requirement |
| --- | --- | --- | --- | --- | --- |
| 所有敏感操作同時驗證 Actor、Action、Resource、Tenant 與 Scope | Permission Engine | 越權 | Backend Authorization | 高風險允許／拒絕需 Audit | 授權本身不取代 Command Key |
| Role／Permission 必須由 Backend 判斷，UI 隱藏不是安全控制 | Permission Engine | URL／Request Tampering | API／Command Authorization | 高風險拒絕需 Audit | 原 Command 仍需 Key |
| Tenant Role 不得取得 Platform 或其他 Tenant 權限 | Permission Engine | Cross-tenant breach | Scope Resolver | Assignment 變更需 Audit | Assignment Command 需 Key |
| Membership 停用後 Role Assignment 不得繼續授權 | Permission Engine | 已離開使用者仍可操作 | Policy + Membership Query | 停用與拒絕可追溯 | 狀態事件消費需去重 |
