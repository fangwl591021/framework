# Lifecycle State Model

> **Conceptual Model / Not Database ENUMs**

以下狀態是跨 Module 的候選語言，不是資料庫 ENUM、Schema 或已實作 State Machine。每次 Transition 都必須由 Owner Module 驗證 Actor、Permission、Tenant Scope、前置狀態、Rule Version 與 Idempotency，並保存來源、時間、理由、Correlation 與必要 Evidence。歷史型資料不得用 Delete 清除交易或關係。

## Platform User

| State | 可進入來源 | 可轉出狀態 | 業務操作 | 歷史 | 誰可變更 | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Active | Verified Identity、Approved Claim、Migration | Suspended、Merged、Deleted、Anonymized | 可被解析並進一步查找 Membership | 保留建立來源 | Identity Center | 建立與恢復需記錄 |
| Suspended | 風險判定、Admin Command | Active、Merged、Deleted、Anonymized | 不可登入；只允許安全查詢與人工處理 | 完整保留 | 授權 Identity Admin | 必須 |
| Merged | Approved Merge | 不回到 Active；必要時進入人工 Split Case | 不可作正常登入主體，只導向 Target | 永久保留 Source／Target | 高風險 Merge 權限角色 | 必須，含 Evidence |
| Deleted | 合法刪除要求、Retention Policy | Anonymized 或依 Policy 不可轉出 | 不可登入或建立新業務關係 | 交易與法定歷史不得連帶刪除 | Privacy／Identity 授權角色 | 必須 |
| Anonymized | Privacy Policy、Retention Job | 通常不可逆 | 不可登入；保留無法回推 PII 的必要歷史參考 | 保留法定與帳務關係 | Privacy 授權角色 | 必須 |

`Deleted` 不代表物理刪除所有 Domain History；是否可恢復及 Anonymization 的不可逆性必須由 Privacy Policy 定義。

## Identity Mapping

| State | 可進入來源 | 可轉出狀態 | 業務操作 | 歷史 | 誰可變更 | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | Provider Callback、Account Linking、Claim | Verified、Conflict、Revoked | 不可作已驗證身份解析 | 保留 Verification Attempt | Identity Center／Adapter | 失敗與衝突需記錄 |
| Verified | Provider 驗證完成 | Active、Conflict、Revoked | 尚未完成 Platform User Linking | 保留 Verification Evidence | Identity Center | 必須 |
| Active | Platform User Resolved 且 Linking 通過 | Revoked、Conflict | 可解析至唯一有效 Platform User | 保留 Linked At／Last Verified | Identity Center | 連結與重新驗證需記錄 |
| Revoked | User Unlink、Provider Revocation、Security Action | Pending（重新綁定）或維持 Revoked | 不可登入或解析新業務操作 | 不刪除舊 Mapping | User／Identity Admin／Provider Event | 必須 |
| Conflict | 同一 Provider Identity 指向不同 User、Claim 衝突 | Active、Revoked | 不可自動合併或解析高風險資料 | 保存所有候選與 Evidence | 授權人工 Reviewer | 必須 |

## Tenant Membership

| State | 可進入來源 | 可轉出狀態 | 業務操作 | 歷史 | 誰可變更 | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Invited | Invite Link、Admin Invitation | Pending、Active、Archived | 只允許接受／拒絕邀請 | 保留邀請來源與期限 | Membership Engine／授權 Admin | 建立與使用需記錄 |
| Pending | Registration、OCR Claim、Campaign、Migration Review | Active、Suspended、Archived、Merged | 不可取得完整 Member 權益 | 保留 Source／Consent Evidence | Membership Engine／Reviewer | 必須 |
| Active | 驗證、Consent、Policy 通過 | Suspended、Left、Archived、Merged | 可依 Permission／Policy 執行 Tenant 業務 | 完整保留 | Membership Engine／授權 Admin | 建立、恢復需記錄 |
| Suspended | Risk、Tenant Admin、Policy | Active、Left、Archived、Merged | 禁止新增一般業務異動；Correction 依 Policy | 完整保留 Point／Referral／Attribution 關聯 | 授權 Tenant Admin | 必須 |
| Left | User Leave、Membership End | Active（Policy 允許重新加入）、Archived、Merged | 不可新增一般 Tenant 業務 | 保留 Joined／Left 歷史 | User／Membership Engine | 必須 |
| Archived | Retention、Tenant Closure、Legacy Closure | 通常不可直接回 Active | Read-only／Audit | 永久或依 Retention 保留 | Tenant Admin／System Policy | 必須 |
| Merged | Approved Duplicate Resolution | 不可作獨立 Active Membership | 不可登入或執行業務，只導向 Target | 保留 Source／Target 且不得覆寫另一 Tenant | 高風險 Merge 權限角色 | 必須 |

## Shop Membership

| State | 可進入來源 | 可轉出狀態 | 業務操作 | 歷史 | 誰可變更 | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | Shop Invitation、Assignment、Migration | Active、Suspended、Ended | 不取得 Shop 操作權 | 保留來源 | Membership Engine／Shop Manager | 建立需記錄 |
| Active | 同 Tenant Membership 有效且核准 | Suspended、Ended | 可依 Shop Scope 操作 | 完整保留 | Membership Engine／授權 Shop Manager | 啟用需記錄 |
| Suspended | Shop Risk／Admin Action | Active、Ended | 不可執行 Shop 業務 | 完整保留 | 授權 Shop Manager／Tenant Admin | 必須 |
| Ended | 關係終止、Shop Closure、Tenant Membership 終止 | 依 Policy 建立新 Pending，不直接覆寫 | 只讀歷史 | 保留 Shop Joined At、Role、Tag 變更 | Membership Engine | 必須 |

## Referral Relationship

| State | 可進入來源 | 可轉出狀態 | 業務操作 | 歷史 | 誰可變更 | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | Membership 建立後的有效 Referral Candidate | Active、Rejected、Invalid、Revoked | 不視為有效 Direct Referrer | 保存 Link／Source／Policy | Referral Engine | 必須 |
| Active | First Valid Referrer 通過 | Replaced、Revoked、Invalid | 作為目前單層直接介紹人 | 完整保留 | Referral Engine；Override 需 Admin Permission | 必須 |
| Rejected | Self、Cycle、Cross-tenant、資格不符 | 通常維持；新 Candidate 建新紀錄 | 不生效 | 保留拒絕理由 | Referral Engine | 必須 |
| Replaced | 合法 Policy／Admin Correction 建立新 Active 關係 | 不回到 Active；再次修正建立新歷史 | 不再是目前關係 | 必須指向替代關係 | 高權限 Admin／Referral Engine | 必須 |
| Revoked | Fraud、Consent／資格政策、人工撤銷 | 依 Policy 建立新 Pending | 不生效 | 保留原始關係 | 授權 Admin | 必須 |
| Invalid | Migration Conflict、Tenant／Identity 不一致 | Pending（補證據）或 Revoked | 不生效 | 保存 Evidence 缺口 | Reviewer／Referral Engine | 必須 |

## Attribution Record

| State | 可進入來源 | 可轉出狀態 | 業務操作 | 歷史 | 誰可變更 | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | Conversion Event、Manual Review | Attributed、Unattributed、Rejected | 尚無最終有效歸因 | 保存 Touch Snapshot／Policy Version | Attribution Engine | 必須 |
| Attributed | Policy 選出有效 Winning Touch | Reversed、Corrected | 是該 Conversion 目前有效結果 | 保存 Decision Evidence | Attribution Engine | 必須 |
| Unattributed | 無足夠有效 Evidence | Corrected | 明確表示無歸屬，不得猜測 | 保存 Reason／Window | Attribution Engine | 必須 |
| Rejected | Conversion／Promoter／Touch 無效 | Corrected | 不產生有效歸因 | 保存拒絕理由 | Attribution Engine／Reviewer | 必須 |
| Reversed | Conversion 取消或 Policy 定義的正式反轉 | Corrected | 舊結果不再有效；下游 Reward 另行處理 | 指向原 Record 與原因 | 授權 Admin／Domain Event | 必須 |
| Corrected | 新 Evidence 或核准人工修正 | 不覆寫；新 Record 進 Attributed／Unattributed／Rejected | 舊 Record 只作歷史 | 永久保留前後關聯 | 高風險 Correction 權限角色 | 必須 |

## Point Account

| State | 可進入來源 | 可轉出狀態 | 業務操作 | 歷史 | 誰可變更 | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Active | Point Program Enrollment、Migration Reconciliation | Frozen、Closed | 可依 Policy 進行 Grant、Deduct、Redeem、Expire 等 Transaction | Ledger 永久保留 | Point Engine | 開立需記錄 |
| Frozen | Risk、Membership Suspended、Admin Action | Active、Closed | 禁止一般交易；Reverse／Correction 依 Policy | Ledger 不變且完整保留 | 授權 Finance／Tenant Admin | 必須 |
| Closed | Program End、Tenant Closure、Approved Account Closure | 通常不可重新開啟；建立新 Account | 只允許查詢與必要 Correction | 不刪除 Ledger | Point Engine／授權 Finance | 必須 |

## 共通 Transition 規則

- Transition Source 至少區分 User Command、Admin Command、Provider Verification、Domain Event、Policy Decision、Migration 與 Scheduled Expiration。
- 其他 Module 不得直接修改 Owner Module 狀態，只能使用公開 Command 或 Domain Event。
- Domain Event 重送必須 Idempotent；Migration 必須保留 Legacy Reference、Batch Key 與 Item Key。
- `Suspended`、`Frozen`、`Left`、`Archived`、`Merged`、`Reversed`、`Corrected` 都不是 Delete。
- State 是否允許操作，仍需同時驗證 Tenant／Shop Scope、Permission、Policy Version 與 Business Preconditions。
