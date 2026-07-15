# Project Checklist

本清單適用於所有由 Platform Core Framework 延伸的 Application。未使用的能力需標示「不適用」並說明原因。

## 1. Architecture Governance

- [ ] Architecture Owner Tony 已核准重大 Architecture Decision。
- [ ] 每項重大 Decision 已引用 ADR，並區分 Proposed／Accepted。
- [ ] 已分別記錄 Implementation Status 與 Production Verification Status。
- [ ] 沒有 AI、Codex、Implementer 或 Module Owner 自行批准 Stable／Core Approved。
- [ ] 沒有客戶專屬 Platform Core 修改；正常答案必須為「否」。

## 2. Framework Composition

- [ ] 已列出使用的 Platform Core Candidate／Approved 能力與版本。
- [ ] 已列出 Domain Module、Lifecycle、版本、Feature Flag 與 Owner。
- [ ] 每個 Domain Module 已完成 Module Contract。
- [ ] 每個 Module 已建立或更新 Module Registry Entry。
- [ ] 已列出 Adapter、Extension、Tenant Configuration 與相關 ADR。
- [ ] Registry、Contract、Lifecycle 與版本內容一致。

## 3. Platform User and Login Identity

- [ ] 已定義 Platform User 建立、合併、停用與刪除。
- [ ] 已定義 Identity Mapping 的連結、解除與復原。
- [ ] 外部 Login Identity 只證明登入，不直接作為 Business Membership 主鍵。
- [ ] 登入成功與 Tenant／Brand／Shop Permission 分開處理。
- [ ] 不以 LINE UID 或 `LINE UID + Shop ID` 取代 Platform User。
- [ ] 身份異動具有 PII Policy 與 Audit Requirement。

## 4. Tenant／Brand／Shop

- [ ] Tenant 是必要且主要的資料隔離邊界。
- [ ] Brand、Shop 僅在有業務需求時建立。
- [ ] 已定義 Tenant Membership、Brand-level Role 與 Shop Membership。
- [ ] 所有 Data、Cache、R2、Queue、Domain Event 都保留 Tenant Scope。
- [ ] Brand／Shop Scope 不會取代 Tenant Scope。
- [ ] 組織節點移動、停用與刪除有 Permission、Audit 與 Rollback 規則。

## 5. Point Scope

- [ ] Point 是否跨 Tenant？正常答案必須為「否」。
- [ ] 是否跨 Shop 使用已由 Tenant Policy 明確決定。
- [ ] D1 是 Point Account／Transaction Source of Truth；KV 不是唯一 Balance 來源。
- [ ] Point Command 已定義 Permission、Idempotency、Audit 與 Error Model。
- [ ] Point Owned Data 不被其他 Module 直接修改。

## 6. Referral and Attribution Scope

- [ ] Referral Relationship 屬於 Tenant Scope，例外需 Accepted ADR。
- [ ] 已定義 Brand／Shop 歸屬與跨 Shop Policy。
- [ ] 已定義 Attribution 採首次、最後點擊或其他 Policy。
- [ ] Referral、Attribution、Point 與 Transaction 各自保有 Module Boundary。
- [ ] 重複、自我推薦、重送與回滾已定義。

## 7. CRM and Membership Scope

- [ ] CRM Profile 與 Tenant Membership 的 Owned Data 已定義。
- [ ] 跨 Shop CRM View 有明確 Tenant Policy 與 Permission。
- [ ] 不同 Tenant 的 CRM、標籤、等級與福利不會自動合併。
- [ ] Provider Profile 不直接覆蓋 Business Membership Data。

## 8. Permission and Security

- [ ] Role、Resource、Action 與 Platform／Tenant／Brand／Shop Scope 已定義。
- [ ] API／Command 執行 Permission，不只依賴前端隱藏。
- [ ] 跨 Tenant、Brand、Shop 負面案例已測試。
- [ ] Security Classification、PII Handling、Audit Log 與最小權限已定義。
- [ ] Security Exception 已由 Tony 批准並有期限與緩解措施。

## 9. Configuration／Policy／Strategy／Extension

- [ ] 參數與開關使用 Configuration，不硬編碼客戶名稱。
- [ ] 可替換算法使用 Policy 或 Strategy。
- [ ] 特殊流程使用 Extension 與正式 Extension Points。
- [ ] 沒有 `if tenant_id === ...` 類型的 Platform Core 判斷。
- [ ] Extension 可由 Feature Flag 停用且不影響其他 Tenant。

## 10. Adapter and Notification

- [ ] Login、Messaging、Payment、AI、OCR 等 Adapter 不承載商業規則。
- [ ] 通知意圖與 LINE、WhatsApp、Email Adapter 分離。
- [ ] 已定義 Consent、Template、Retry、Result 與 Tenant Scope。
- [ ] Adapter Error 不洩露 Token、Secret、UID 或 PII。

## 11. Module Contract and Collaboration

- [ ] Commands、Queries、Domain Events、Owned Data、Read-only External Data 完整。
- [ ] Public Interface 與 Private Implementation 明確分離。
- [ ] Module 只透過 Interface、Command、Query、Domain Event 或 Queue 協作。
- [ ] 沒有直接查詢其他 Module 資料表或 Import private function。
- [ ] Breaking Change 具 MAJOR 版本、Migration、Rollback、ADR 與 Tony 批准。

## 12. Data、D1 and KV

- [ ] 每項資料的 Source of Truth 與 Cache 已標明。
- [ ] KV Cache Miss 可回到 D1，不一致時以 D1 為準。
- [ ] Cache Key 包含必要 Tenant／Brand／Shop Scope。
- [ ] Schema Proposal 引用 Accepted Boundary、Module Contract 與 ADR。
- [ ] Migration、Retention、Deletion、Audit 與 Rollback 已定義。

## 13. Cross-cutting Candidates

- [ ] Audit Log 未混入 Token、Secret、完整 PII 或 Business Transaction 本體。
- [ ] Feature Flag 具 Owner、Default State、Scope、Expiration、Removal Plan。
- [ ] Idempotency 具 Key、Scope、Expiration、Stored Result、Conflict、Retry Behavior。
- [ ] Module Registry 不執行商業邏輯，也不包含 Tenant Runtime Data。
- [ ] Candidate 沒有被誤標為 Implemented、Stable 或 Core Approved。

## 14. Modular Monolith Worker

- [ ] Platform Core、Domain Module、Adapter、Extension、Application Composition 已分離。
- [ ] 主入口只負責啟動、Route 掛載與 Dependency Composition。
- [ ] Route、SQL、商業規則、Provider API、Flex、OCR、Point 計算未混在同一大型檔案。
- [ ] 多 Worker 拆分由安全、流量、部署、故障或 Cloudflare 限制證據驅動。

## 15. Quality and Release Gate

- [ ] 每個 Module 有版本鎖定、Testing Requirements 與 Backward Compatibility。
- [ ] 已完成 Contract、Tenant Boundary、Security、Idempotency、Feature Flag 與 Rollback 驗證。
- [ ] Staging 與 Production Verification Evidence 分開記錄。
- [ ] 所有例外有 Owner、期限、Approval Reference 與移除計畫。
- [ ] 發布 Branch、Commit、依賴版本、環境與 Authorized Operator 可追溯。

## 16. Sprint 4 Domain Model Gate

- [ ] Platform User、Tenant Membership、Shop Membership 已分離。
- [ ] External Identity 只在 Identity Mapping，不作 Business Primary Key。
- [ ] 同一 Platform User／Tenant 最多一個 Active Tenant Membership。
- [ ] Point Program、Account、Transaction 與 Rule 已分離，Balance 可由 Ledger 重建。
- [ ] Referral Relationship、Attribution Touch、Attribution Record 與 Commission 已分離。
- [ ] Referral 預設 Single-layer、No Self、No Cycle、No Normal Overwrite。
- [ ] 每個 Conversion 同時最多一個 Active Attribution Record，Correction 保留歷史。
- [ ] Role Assignment 明確定義 Platform／Tenant／Brand／Shop／Own／Assigned Scope。
- [ ] Lifecycle、Invariant、Historical Correction、Idempotency 與 Audit 已寫入 Contract。
- [ ] Duplicate、Merge、Split 與 Legacy Migration 不依模糊 PII 自動判定。
- [ ] [Scenario Validation Matrix](33-SCENARIO-VALIDATION-MATRIX.md) 的適用案例均有結果與證據。

## 17. Detailed Membership and Attribution Review

- [ ] 未使用 Provider Identity 作任何業務 Aggregate Primary Key。
- [ ] 已定義 Tenant Membership 唯一性與 Shop Scope。
- [ ] 已定義 Point Program、Point Ledger、Balance Insufficient Policy 與 D1 Source of Truth。
- [ ] 已定義 Referral Candidate、Identity Resolution、Membership Created、Referral Confirmed 的建立時機。
- [ ] Referral 與 Attribution 已分離，並明確定義 Attribution Window、Model 與 Rule Version。
- [ ] Attendance、Point、Referral、Attribution Command 均具 Idempotency Boundary。
- [ ] Duplicate、Claim、Merge、Split、Migration 與 Historical Correction 有正式計畫。
- [ ] 已完成附件指定的 Scenario Matrix，包括 QR 未授權、OCR Claim 與 Promoter Qualification 變更。

## 18. Transactional Engine Contract Gate

- [ ] Point Program、Cross-Shop Policy 與 `Reject Entire Transaction` Insufficient Policy 明確。
- [ ] Referral Confirmation 時機、First Valid Referrer、Confirmed 後 Change Policy 明確。
- [ ] Attribution Model、Window、Policy Version、Unattributed 與 Promoter Eligibility 明確。
- [ ] Attendance 已區分 Physical／Online 驗證，且不直接修改 Point Account。
- [ ] Redemption 已定義 Member／Merchant QR 模式、Merchant Auth、Shop Scope 與 Point Result Reconciliation。
- [ ] 每個交易有 Business Reference、Idempotency Key／Stored Result、Failure Taxonomy、Retry 與 Audit。
- [ ] 完成交易使用 Reverse／Correct／Adjust，不使用 Delete。
- [ ] Notification Failure 不回滾核心交易。
- [ ] 五個 Registry Entry 與 Contract Lifecycle／Owner／Version／Production Use 一致。
- [ ] Module Contract 與 20 個 Transaction Scenario 已逐項審查。

## 19. Sprint 6 D1 Logical Design Gate

- [ ] Logical Record Catalog 涵蓋 Identity、Organization、Membership、Permission 與五個 Candidate Engine。
- [ ] 每個 Logical Record 有唯一 Owner Module、Tenant Scope 與 History Rule。
- [ ] Platform User、Identity Mapping、Tenant Membership、Shop Membership、Role Assignment 保持分離。
- [ ] Point Account／Ledger／Projection 分離，Balance Projection 可由 D1 Ledger 重建。
- [ ] Referral Relationship、Attribution Touch 與 Attribution Record 不共用可覆寫欄位。
- [ ] Attendance／Redemption 與 Point 使用 Business Reference、Stored Result、Reconciliation 協作。
- [ ] Idempotency／Audit Candidate 不接管 Domain Transaction 本體。
- [ ] Logical Uniqueness、Conflict、Original／Correction／Merge Chain 與跨 Tenant 拒絕規則已定義。
- [ ] Retention Class、Erasure、Anonymization、Archive 與 Legal Hold 問題已列出 Owner。
- [ ] Access Pattern、容量、競爭與 Index Candidate 留待 evidence-based Physical Design。
- [ ] 未建立 SQL、D1 Table、Column Type、Index Syntax、Migration、Runtime 或部署。
- [ ] Physical Schema 工作開始前已通過 [Schema Implementation Readiness Checklist](51-SCHEMA-IMPLEMENTATION-READINESS-CHECKLIST.md)。

## 20. Architecture Handbook Reading Gate

- [ ] 已完成與角色相符的 [Handbook Reading Path](handbook/14-READING-PATHS.md)。
- [ ] 已閱讀 [Architecture Handbook](../ARCHITECTURE-HANDBOOK.md)，並再查閱 relevant 正式文件，而非只依 Handbook 摘要。
- [ ] 每個重大 Decision 都引用正式 ADR，且確認其狀態是 `Accepted` 或 `Proposed`。
- [ ] 已分別確認 Decision、Contract、Lifecycle、Implementation 與 Verification 狀態，不互相推導。
- [ ] Candidate Source、Candidate Module 與 Platform Core Candidate 未被描述為 Stable、Implemented 或 Production Ready。
- [ ] AI／Codex 已閱讀 [Working Guide](handbook/10-AI-CODEX-WORKING-GUIDE.md) 並完成 Repository／Branch／HEAD／Workspace Preflight。

## 21. Sprint 7 Physical D1 Schema Proposal Gate

- [ ] 每張 Table 有 Logical Model mapping、Owner Module、Tenant Scope、PII 與 history rule。
- [ ] PK、FK、composite tenant FK、Unique、CHECK 與 application-only invariant 已審查。
- [ ] Gate 1 Cross-Tenant Foreign Key Review 已通過且同步後回歸未退化。
- [ ] Gate 2 Active-only Uniqueness Review 已通過且同步後回歸未退化。
- [ ] Gate 3 Point Ledger Concurrency Review 已通過且同步後回歸未退化。
- [ ] Table plural snake_case、FK 以 _id 結尾、UTC time naming 與 Tenant Scope 一致。
- [ ] Point Ledger 只含正式 Entry；Failed Point Intent 不建立 row；Balance 可重建。
- [ ] Audit 不複製 Domain Record／完整 Payload；KV 不是 Source of Truth。
- [ ] 每個 Index Candidate 對應 Query ID、composite order、cursor、write cost 與 evidence status。
- [ ] Identity、Membership、Point、Referral、Attribution、Attendance、Redemption transaction boundary 已審查。
- [ ] Migration 採 additive／bounded backfill／constraint scan／forward fix／rollback 分類。
- [ ] Reconciliation 涵蓋 projection drift、active uniqueness、scope、orphan、merge chain 與 Stored Result。
- [ ] Capacity、Retention、Archive、D1 topology options 與官方 limits 已列入未決決策。
- [ ] SQL Header、SQL location、documentation-only migration path 與 no-execute rule 已驗證。
- [ ] Schema Status 仍為 Not Approved；Migration Not Executed；Runtime Not Implemented；Production Not Deployed。

## 22. Framework RC1／Approved Migration Package Gate

- [ ] 已閱讀 [Framework RC1](releases/RC1.md)、Component Matrix、Known Limitations 與 Freeze Policy。
- [ ] 已確認 RC1 是 Documentation Baseline，不是 Runtime／Schema／Migration Release。
- [ ] Migration Package Designed 已從 Proposed 取得正式核准。
- [ ] Test Plan 已由 Architecture 與 Security 分別核准。
- [ ] Local D1 與 Fresh／Seeded Isolated D1 有可重現證據。
- [ ] A01～A06 均為 Executed／Verified，且整批 rollback final state 正確。
- [ ] Constraint、Trigger、Atomicity、Concurrency、Replay 與 Fencing 測試完成。
- [ ] Rollback、Forward Fix、Reconciliation 與 Promotion Runbook 已演練。
- [ ] Architecture Gate、Security Gate、Execution Approval Gate 分別通過。
- [ ] Evidence Registry 綁定 commit、schema hash、fixture hash、Run ID 與 reviewer。
- [ ] Go／No-Go Decision 為 GO。
- [ ] Production Migration 已取得四角色所需的獨立核准。

本 Sprint 僅建立 Design；以上項目不得因文件或 PR 存在而自動勾選。

## QA Governance Checklist

- [ ] QA Governance Foundation 已由具名 Authority 核准。
- [ ] Test Case、Fixture／Seed、Expected Result 與 Evidence 標準已核准。
- [ ] Coverage、Concurrency、Recovery、Performance 與 Security 測試範圍已核准。
- [ ] Test Execution Lifecycle 與 Evidence Review Workflow 已核准。
- [ ] QA Reviewer、Security Reviewer、Test Operator 與 Execution Approver 已指派。
- [ ] Migration Test Plan 已完成 QA Governance Mapping。
- [ ] Test Plan Approved 已正式更新為 Yes。
- [ ] Test Library 已實作並獨立審查。
- [ ] Local／Isolated D1 測試已有可驗證 Evidence。

目前以上項目均未因 QA Governance Design 建立而完成；PR #9 仍維持 NO-GO。
