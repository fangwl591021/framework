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
