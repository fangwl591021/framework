# Platform Core Framework

## Start Here

[Architecture Handbook](ARCHITECTURE-HANDBOOK.md) 是 Framework 的最高層理解與導航入口；它提供摘要與閱讀路徑，不取代 Accepted ADR、正式 Boundary 或 Module Contract。

| 讀者 | 入口 |
| --- | --- |
| Architecture Owner | [Decision Status／Open Decisions](docs/handbook/13-DECISION-STATUS-MAP.md) |
| Engineer | [Architecture Layers／Module Map](docs/handbook/03-ARCHITECTURE-LAYERS.md) |
| Codex | [AI and Codex Working Guide](docs/handbook/10-AI-CODEX-WORKING-GUIDE.md) |
| Business Partner | [Executive Overview](docs/handbook/01-EXECUTIVE-OVERVIEW.md) |
| New Team Member | [Reading Paths](docs/handbook/14-READING-PATHS.md) |

Platform Core Framework 是未來 SaaS 產品共用的母框架，用來定義跨專案一致的架構語言、模組邊界、開發標準與治理原則。

## Repository Status

```text
Documentation and Schema Proposal Stage
No Runtime Implemented
No D1 Schema Implemented
No Migration Executed
No Deployment
No Production Verification
```

目前 Repository 包含架構、治理、D1 Logical Design 與 Physical Schema Proposal 文件。SQL 與 Migration Draft 只供審查，尚未對 SQLite 或 D1 執行；沒有 Worker、Binding、API、Module Runtime 或部署。Proposal、Constraint Candidate、Index Candidate 或 ADR Accepted 都不代表已 Implemented、Performance Verified 或 Production Ready。

## 目的

- 建立可重複使用的 SaaS 核心能力藍圖。
- 降低不同 Application 重複設計、重複開發與維護分歧。
- 讓新 Application 從一致的 Identity、Tenant、Permission、API 與 Domain Module 邊界開始。
- 以文件先行方式建立未來實作、審查、版本與驗收依據。

## 核心定位

- **所有 SaaS 共用核心**：集中定義可共用的平台能力與標準。
- **Framework 不屬於任何客戶**：不得放入客戶專屬規則、品牌設定或商業流程。
- **所有功能皆模組化**：每項能力以清楚邊界、穩定 Interface 與獨立驗證為原則。
- **文件先於程式**：先確認 Decision、Boundary、Contract 與驗收，再進入實作。
- **Core 與 Application 分離**：Application 組合或擴充能力，不把客戶邏輯回灌為 Platform Core 預設行為。

## Framework 五層架構

1. **Platform Core**：跨產業、跨 Tenant、跨通道的底層能力與規範。
2. **Domain Module**：可獨立啟用、測試與版本化的領域能力。
3. **Adapter**：隔離 LINE、WhatsApp、Google、AI、OCR 等 Provider 差異。
4. **Extension**：透過正式 Extension Points 承載特定客戶或產業流程。
5. **Application／Tenant Configuration**：組合能力並以 Configuration 表達 Tenant 差異。

詳見 [Framework Layers](docs/10-FRAMEWORK-LAYERS.md)。

## Architecture Ownership

- Architecture Owner：**Tony**。
- Tony 最終批准 Platform Core 變更、Module 晉升、Breaking Change 與 ADR Acceptance。
- Platform Architect、Module Owner、Implementer 與 Reviewer 依 RACI 分工。
- AI、Codex 與工程師可以提出 Proposal、Draft ADR 與實作已批准設計，不得自行批准 Stable、Core Approved 或重大 ADR。

詳見 [Architecture Ownership](docs/18-ARCHITECTURE-OWNERSHIP.md)。

## Accepted Architecture Decisions

| ADR | Status | Decision | Implementation | Verification |
| --- | --- | --- | --- | --- |
| [ADR-001](docs/adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md) | Accepted | Platform User 與 Tenant Membership 分離 | Not Implemented | Not Verified |
| [ADR-002](docs/adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md) | Accepted | D1 為 Source of Truth，KV 為選用 Cache | Not Implemented | Not Verified |
| [ADR-003](docs/adr/ADR-003-MODULAR-MONOLITH-WORKER.md) | Accepted | 初期採 Modular Monolith Worker | Not Implemented | Not Verified |
| [ADR-004](docs/adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md) | Accepted | Tenant 必要，Brand／Shop 選用 | Not Implemented | Not Verified |
| [ADR-005](docs/adr/ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md) | Accepted | Referral Relationship 與 Attribution 分離 | Not Implemented | Not Verified |
| [ADR-006](docs/adr/ADR-006-TENANT-SCOPED-POINT-ACCOUNTS.md) | Accepted | Point Account 採 Tenant Scope | Not Implemented | Not Verified |
| [ADR-007](docs/adr/ADR-007-SINGLE-LAYER-REFERRAL-DEFAULT.md) | Accepted | Referral 預設採 Single-layer | Not Implemented | Not Verified |
| [ADR-008](docs/adr/ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md) | Accepted | External Identity 不作 Business Key | Not Implemented | Not Verified |
| [ADR-009](docs/adr/ADR-009-REJECT-INSUFFICIENT-POINT-BALANCE.md) | Accepted | 餘額不足整筆拒絕 | Not Implemented | Not Verified |
| [ADR-010](docs/adr/ADR-010-FIRST-VALID-REFERRER.md) | Accepted | First Valid Referrer | Not Implemented | Not Verified |
| [ADR-011](docs/adr/ADR-011-DEFAULT-FIRST-TOUCH-ATTRIBUTION.md) | Accepted | First Valid Touch／30-Day Window | Not Implemented | Not Verified |
| [ADR-012](docs/adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md) | Accepted | 完成交易採 Reverse／Correct，不 Delete | Not Implemented | Not Verified |

## Module Contract and Registry

- 每個 Domain Module 在進入 Experimental 前需建立 [Module Contract](docs/19-MODULE-CONTRACT-STANDARD.md)。
- [Module Registry](docs/20-MODULE-REGISTRY-STANDARD.md) 記錄 Lifecycle、版本、Owner、依賴與相容性。
- Module Registry 目前只是 Platform Core Candidate，不執行商業邏輯，也不代表 Module 已部署。

## Organization Hierarchy

Framework 採選用階層：`Tenant → Brand → Shop`。Tenant 是必要的資料隔離層；Brand、Shop 可依 Application 需求省略。詳見 [Organization Hierarchy](docs/22-ORGANIZATION-HIERARCHY.md)。

## Repository Governance

- `main` 應維持穩定、可閱讀且內容一致。
- 文件與程式修改由獨立 Branch／Pull Request 審查後合併。
- Breaking Change 與重大 Boundary 調整需有 ADR 及 Tony 批准。
- ADR Accepted、Implementation Completed、Production Verified 是三個獨立狀態。
- 尚未批准任何舊專案程式進入 Platform Core，也沒有 Production Module。

## 文件索引

### Foundation

| 文件 | 用途 |
| --- | --- |
| [00-VISION](docs/00-VISION.md) | 長期願景與平台方向 |
| [01-PLATFORM-BLUEPRINT](docs/01-PLATFORM-BLUEPRINT.md) | 五層架構、治理、身份與組織藍圖 |
| [02-FEATURE-ASSET-MAP](docs/02-FEATURE-ASSET-MAP.md) | 舊功能 Candidate Source、成熟度與風險 |
| [03-DEVELOPMENT-STANDARD](docs/03-DEVELOPMENT-STANDARD.md) | 模組化、檔案責任、測試與 API 原則 |
| [04-CLOUDFLARE-STANDARD](docs/04-CLOUDFLARE-STANDARD.md) | Cloudflare 服務責任邊界 |
| [05-DATABASE-STANDARD](docs/05-DATABASE-STANDARD.md) | 資料概念、Source of Truth 與治理原則 |
| [06-IDENTITY-CENTER](docs/06-IDENTITY-CENTER.md) | Platform User、Identity Mapping 與 Membership |
| [07-ENGINE-DESIGN](docs/07-ENGINE-DESIGN.md) | Engine 清單與邊界契約模板 |
| [08-AI-DEVELOPMENT-RULE](docs/08-AI-DEVELOPMENT-RULE.md) | AI、Codex 與工程師共同作業規則 |
| [09-PROJECT-CHECKLIST](docs/09-PROJECT-CHECKLIST.md) | Application 啟動、治理與交付清單 |

### Governance

| 文件 | 用途 |
| --- | --- |
| [10-FRAMEWORK-LAYERS](docs/10-FRAMEWORK-LAYERS.md) | Framework 五層與依賴方向 |
| [11-MODULE-LIFECYCLE](docs/11-MODULE-LIFECYCLE.md) | Module 晉升、批准、降級與 Stable 標準 |
| [12-VERSION-DEPENDENCY-RULES](docs/12-VERSION-DEPENDENCY-RULES.md) | SemVer、依賴方向與協作方式 |
| [13-ADR-TEMPLATE](docs/13-ADR-TEMPLATE.md) | ADR 欄位、狀態與批准規則 |
| [14-MODULE-PROMOTION-STANDARD](docs/14-MODULE-PROMOTION-STANDARD.md) | Module Promotion 證據與評分 |
| [15-TENANT-DATA-BOUNDARY](docs/15-TENANT-DATA-BOUNDARY.md) | Tenant、Brand、Shop 與 Membership 隔離 |
| [16-CONFIGURATION-EXTENSION-RULES](docs/16-CONFIGURATION-EXTENSION-RULES.md) | Configuration、Policy、Strategy、Extension 分界 |
| [17-LEGACY-ASSET-EXTRACTION](docs/17-LEGACY-ASSET-EXTRACTION.md) | Candidate Source 唯讀稽核與 Gap Analysis |
| [18-ARCHITECTURE-OWNERSHIP](docs/18-ARCHITECTURE-OWNERSHIP.md) | Tony 與各治理角色的權責及 RACI |
| [19-MODULE-CONTRACT-STANDARD](docs/19-MODULE-CONTRACT-STANDARD.md) | Domain Module Contract 必要欄位與定義 |
| [20-MODULE-REGISTRY-STANDARD](docs/20-MODULE-REGISTRY-STANDARD.md) | Module Registry metadata 與狀態一致性 |
| [21-CORE-CROSSCUTTING-CANDIDATES](docs/21-CORE-CROSSCUTTING-CANDIDATES.md) | 四項 Platform Core Candidate 邊界 |
| [22-ORGANIZATION-HIERARCHY](docs/22-ORGANIZATION-HIERARCHY.md) | Tenant／Brand／Shop 結構與 Scope |

### Domain Models

| 文件 | 用途 |
| --- | --- |
| [23-CORE-DOMAIN-MODEL](docs/23-CORE-DOMAIN-MODEL.md) | 核心 Entity、關係與建模語言 |
| [24-IDENTITY-MAPPING-MODEL](docs/24-IDENTITY-MAPPING-MODEL.md) | 外部 Identity 驗證、連結與衝突 |
| [25-MEMBERSHIP-MODEL](docs/25-MEMBERSHIP-MODEL.md) | Platform User、Tenant／Shop Membership 邊界 |
| [26-POINT-ACCOUNT-MODEL](docs/26-POINT-ACCOUNT-MODEL.md) | Point Program、Account、Transaction 與 Ledger |
| [27-REFERRAL-RELATIONSHIP-MODEL](docs/27-REFERRAL-RELATIONSHIP-MODEL.md) | Tenant-scoped Single-layer Referral |
| [28-ATTRIBUTION-MODEL](docs/28-ATTRIBUTION-MODEL.md) | Share Link、Touch、Conversion 與 Record |
| [29-ROLE-PERMISSION-SCOPE](docs/29-ROLE-PERMISSION-SCOPE.md) | Role、Permission、Assignment 與 Scope |
| [30-DOMAIN-INVARIANTS](docs/30-DOMAIN-INVARIANTS.md) | 跨領域不變條件與 Enforcement 責任 |
| [31-LIFECYCLE-STATE-MODEL](docs/31-LIFECYCLE-STATE-MODEL.md) | 核心 Aggregate 概念生命週期 |
| [32-DUPLICATE-MERGE-MIGRATION](docs/32-DUPLICATE-MERGE-MIGRATION.md) | Duplicate、Merge、Split 與 Legacy Migration |
| [33-SCENARIO-VALIDATION-MATRIX](docs/33-SCENARIO-VALIDATION-MATRIX.md) | Domain Scenario 與未來驗收矩陣 |

### Transactional Engine Contracts

| 文件 | 用途 |
| --- | --- |
| [34-POINT-ENGINE-CONTRACT](docs/34-POINT-ENGINE-CONTRACT.md) | Point Program、Account、Ledger 與 Transaction Contract |
| [35-REFERRAL-ENGINE-CONTRACT](docs/35-REFERRAL-ENGINE-CONTRACT.md) | Single-Layer Referral Contract |
| [36-ATTRIBUTION-ENGINE-CONTRACT](docs/36-ATTRIBUTION-ENGINE-CONTRACT.md) | Share、Touch、Conversion 與 Decision Contract |
| [37-ATTENDANCE-ENGINE-CONTRACT](docs/37-ATTENDANCE-ENGINE-CONTRACT.md) | Physical／Online Attendance Contract |
| [38-REDEMPTION-ENGINE-CONTRACT](docs/38-REDEMPTION-ENGINE-CONTRACT.md) | Merchant-verified Redemption Contract |
| [39-TRANSACTION-SAFETY-STANDARD](docs/39-TRANSACTION-SAFETY-STANDARD.md) | Atomic Intent、Failure、Compensation 與 Scope |
| [40-IDEMPOTENCY-STANDARD](docs/40-IDEMPOTENCY-STANDARD.md) | Idempotency Key、Stored Result、Conflict 與候選 Storage |
| [41-CORRECTION-REVERSAL-STANDARD](docs/41-CORRECTION-REVERSAL-STANDARD.md) | Cancel、Reject、Reverse、Correct、Adjust、Delete 分界 |
| [42-ENGINE-INTEGRATION-MATRIX](docs/42-ENGINE-INTEGRATION-MATRIX.md) | 五個 Engine 的 Command／Query／Event 協作 |
| [43-TRANSACTION-SCENARIO-MATRIX](docs/43-TRANSACTION-SCENARIO-MATRIX.md) | 20 個交易安全驗收情境 |

### D1 Logical Data Design

| 文件 | 用途 |
| --- | --- |
| [44-D1-LOGICAL-DATA-MODEL](docs/44-D1-LOGICAL-DATA-MODEL.md) | D1 logical records、ownership、keys 與 consistency boundary |
| [45-IDENTITY-MEMBERSHIP-LOGICAL-MODEL](docs/45-IDENTITY-MEMBERSHIP-LOGICAL-MODEL.md) | Identity、Organization、Membership 與 Role Assignment 邏輯關係 |
| [46-POINT-LEDGER-LOGICAL-MODEL](docs/46-POINT-LEDGER-LOGICAL-MODEL.md) | Point Program、Account、Ledger 與可重建 Balance Projection |
| [47-REFERRAL-ATTRIBUTION-LOGICAL-MODEL](docs/47-REFERRAL-ATTRIBUTION-LOGICAL-MODEL.md) | Referral、Share、Touch 與 Attribution Decision 邏輯模型 |
| [48-ATTENDANCE-REDEMPTION-LOGICAL-MODEL](docs/48-ATTENDANCE-REDEMPTION-LOGICAL-MODEL.md) | Attendance／Redemption record 與跨 Module transaction boundary |
| [49-AUDIT-IDEMPOTENCY-LOGICAL-MODEL](docs/49-AUDIT-IDEMPOTENCY-LOGICAL-MODEL.md) | Audit／Idempotency Candidate 的 logical content 與責任分離 |
| [50-DATA-INTEGRITY-RETENTION-MATRIX](docs/50-DATA-INTEGRITY-RETENTION-MATRIX.md) | Scope、uniqueness、history、cache 與 retention governance matrix |
| [51-SCHEMA-IMPLEMENTATION-READINESS-CHECKLIST](docs/51-SCHEMA-IMPLEMENTATION-READINESS-CHECKLIST.md) | 未來 Physical D1 Schema Sprint 的進入 Gate |

### Physical D1 Schema Proposal

| 文件 | 用途 |
| --- | --- |
| [52-PHYSICAL-D1-SCHEMA-OVERVIEW](docs/52-PHYSICAL-D1-SCHEMA-OVERVIEW.md) | 29 張 Table Catalog、共通 ID／Time／Tenant／History 策略 |
| [53-IDENTITY-MEMBERSHIP-PHYSICAL-SCHEMA](docs/53-IDENTITY-MEMBERSHIP-PHYSICAL-SCHEMA.md) | Identity、Organization、Membership、Role／Permission |
| [54-POINT-LEDGER-PHYSICAL-SCHEMA](docs/54-POINT-LEDGER-PHYSICAL-SCHEMA.md) | Point Program、Account、正式 Ledger 與 Projection |
| [55-REFERRAL-ATTRIBUTION-PHYSICAL-SCHEMA](docs/55-REFERRAL-ATTRIBUTION-PHYSICAL-SCHEMA.md) | Referral、Share、Touch、Conversion Reference 與 Attribution |
| [56-ATTENDANCE-REDEMPTION-PHYSICAL-SCHEMA](docs/56-ATTENDANCE-REDEMPTION-PHYSICAL-SCHEMA.md) | Attendance Attempt／Record 與 Redemption Intent／Result |
| [57-AUDIT-IDEMPOTENCY-PHYSICAL-SCHEMA](docs/57-AUDIT-IDEMPOTENCY-PHYSICAL-SCHEMA.md) | Audit／Idempotency Candidate Storage |
| [58-INDEX-QUERY-EVIDENCE](docs/58-INDEX-QUERY-EVIDENCE.md) | 19 個 Query 與 Index Candidate Evidence |
| [59-TRANSACTION-BOUNDARY-PROPOSAL](docs/59-TRANSACTION-BOUNDARY-PROPOSAL.md) | Local／cross-module transaction 與 failure boundary |
| [60-MIGRATION-ROLLBACK-STRATEGY](docs/60-MIGRATION-ROLLBACK-STRATEGY.md) | Expand、Backfill、Verify、Rollback 與 Forward Fix |
| [61-RECONCILIATION-BACKFILL-STRATEGY](docs/61-RECONCILIATION-BACKFILL-STRATEGY.md) | Reconciliation Matrix 與 resumable backfill |
| [62-D1-CAPACITY-RETENTION-PLAN](docs/62-D1-CAPACITY-RETENTION-PLAN.md) | Capacity、Retention、Archive 與 D1 topology options |
| [63-PHYSICAL-SCHEMA-REVIEW-CHECKLIST](docs/63-PHYSICAL-SCHEMA-REVIEW-CHECKLIST.md) | Architecture Owner Physical Schema Gate |

### SQL Proposal Index

| Proposal | Domain |
| --- | --- |
| [001-core-identity-membership.sql](docs/schema/proposals/001-core-identity-membership.sql) | Identity／Organization／Membership／Permission |
| [002-point-ledger.sql](docs/schema/proposals/002-point-ledger.sql) | Point Ledger／Projection |
| [003-referral-attribution.sql](docs/schema/proposals/003-referral-attribution.sql) | Referral／Attribution |
| [004-attendance-redemption.sql](docs/schema/proposals/004-attendance-redemption.sql) | Attendance／Redemption |
| [005-audit-idempotency.sql](docs/schema/proposals/005-audit-idempotency.sql) | Audit／Idempotency |

### Migration Strategy

- [Migration Draft Safety](docs/schema/migrations/README.md)
- [0001 Initial Schema Draft](docs/schema/migrations/0001-initial-schema.draft.sql)
- 所有 SQL 都是 Proposal Only / Do Not Execute，不位於 Wrangler 預設 migration path。

### Engine Registry Entries

| Entry | Status |
| --- | --- |
| [point-engine](docs/registry/point-engine.md) | Candidate／Not Implemented／Production Use Not Allowed |
| [referral-engine](docs/registry/referral-engine.md) | Candidate／Not Implemented／Production Use Not Allowed |
| [attribution-engine](docs/registry/attribution-engine.md) | Candidate／Not Implemented／Production Use Not Allowed |
| [attendance-engine](docs/registry/attendance-engine.md) | Candidate／Not Implemented／Production Use Not Allowed |
| [redemption-engine](docs/registry/redemption-engine.md) | Candidate／Not Implemented／Production Use Not Allowed |

### ADR Index

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-001](docs/adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md) | Separate Platform User from Tenant Membership | Accepted |
| [ADR-002](docs/adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md) | Use D1 as Source of Truth and KV as Optional Cache | Accepted |
| [ADR-003](docs/adr/ADR-003-MODULAR-MONOLITH-WORKER.md) | Begin with a Modular Monolith Cloudflare Worker | Accepted |
| [ADR-004](docs/adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md) | Adopt an Optional Tenant–Brand–Shop Hierarchy | Accepted |
| [ADR-005](docs/adr/ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md) | Separate Referral Relationship from Transaction Attribution | Accepted |
| [ADR-006](docs/adr/ADR-006-TENANT-SCOPED-POINT-ACCOUNTS.md) | Scope Point Accounts to Tenant Membership | Accepted |
| [ADR-007](docs/adr/ADR-007-SINGLE-LAYER-REFERRAL-DEFAULT.md) | Use Single-Layer Referral as the Default Policy | Accepted |
| [ADR-008](docs/adr/ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md) | Do Not Use External Provider Identity as the Business Primary Key | Accepted |
| [ADR-009](docs/adr/ADR-009-REJECT-INSUFFICIENT-POINT-BALANCE.md) | Reject Point Transactions When Balance Is Insufficient | Accepted |
| [ADR-010](docs/adr/ADR-010-FIRST-VALID-REFERRER.md) | Use First Valid Referrer as the Default Referral Policy | Accepted |
| [ADR-011](docs/adr/ADR-011-DEFAULT-FIRST-TOUCH-ATTRIBUTION.md) | Use First Valid Touch with a 30-Day Default Attribution Window | Accepted |
| [ADR-012](docs/adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md) | Reverse or Correct Completed Transactions Instead of Deleting Them | Accepted |

### Template Index

| Template | 用途 |
| --- | --- |
| [Module Contract Template](docs/templates/MODULE-CONTRACT-TEMPLATE.md) | 建立完整 Domain Module Contract |
| [Module Registry Entry Template](docs/templates/MODULE-REGISTRY-ENTRY-TEMPLATE.md) | 建立單一 Module Registry Entry |

## Framework RC1 and Migration Governance

Framework RC1 是以 `6dd23c30dd496a4892660c71b33349c2695ecb67` 為來源的 Architecture Release Candidate／Documentation Baseline。它納入 Physical D1 Schema Proposal 與三項已通過的 Architecture Review Gate，但不代表 Schema、Migration、Runtime 或 Production 已可執行。

- [RC1 Release Baseline](docs/releases/RC1.md)
- [RC1 Component Matrix](docs/releases/RC1-COMPONENT-MATRIX.md)
- [RC1 Known Limitations](docs/releases/RC1-KNOWN-LIMITATIONS.md)
- [RC1 Freeze Policy](docs/releases/RC1-FREEZE-POLICY.md)
- [Approved Migration Package Design](docs/migration-package/README.md)
- [Current Go／No-Go Decision](docs/migration-package/11-GO-NOGO-DECISION.md)

目前狀態：Package Designed = Proposed；Local／Isolated D1 尚未測試；Architecture／Security／Execution Approval 均未取得；決策為 **NO-GO — Execution Not Yet Approved**。Test design、approval、execution 與 verification 必須分開記錄。
