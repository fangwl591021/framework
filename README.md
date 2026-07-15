# Platform Core Framework

Platform Core Framework 是未來 SaaS 產品共用的母框架，用來定義跨專案一致的架構語言、模組邊界、開發標準與治理原則。

## Repository Status

```text
Documentation Stage
No Runtime Implemented
No Database Schema Implemented
No Production Verification
```

目前 Repository 只包含架構與治理文件，尚未建立 Worker、Schema、Migration、API、Module Runtime 或部署設定。列為 Candidate 或 ADR Accepted 的內容，不代表已 Implemented 或 Production Verified。

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

### ADR Index

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-001](docs/adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md) | Separate Platform User from Tenant Membership | Accepted |
| [ADR-002](docs/adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md) | Use D1 as Source of Truth and KV as Optional Cache | Accepted |
| [ADR-003](docs/adr/ADR-003-MODULAR-MONOLITH-WORKER.md) | Begin with a Modular Monolith Cloudflare Worker | Accepted |
| [ADR-004](docs/adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md) | Adopt an Optional Tenant–Brand–Shop Hierarchy | Accepted |
| [ADR-005](docs/adr/ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md) | Separate Referral Relationship from Attribution | Accepted |
| [ADR-006](docs/adr/ADR-006-TENANT-SCOPED-POINT-ACCOUNTS.md) | Use Tenant-scoped Point Accounts | Accepted |
| [ADR-007](docs/adr/ADR-007-SINGLE-LAYER-REFERRAL-DEFAULT.md) | Use Single-layer Referral by Default | Accepted |
| [ADR-008](docs/adr/ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md) | External Identity Is Not a Business Key | Accepted |

### Template Index

| Template | 用途 |
| --- | --- |
| [Module Contract Template](docs/templates/MODULE-CONTRACT-TEMPLATE.md) | 建立完整 Domain Module Contract |
| [Module Registry Entry Template](docs/templates/MODULE-REGISTRY-ENTRY-TEMPLATE.md) | 建立單一 Module Registry Entry |
