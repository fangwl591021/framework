# Platform Core Framework — Architecture Handbook

> Framework 的最高層理解與導航入口。Handbook 是摘要，不取代 Accepted ADR、正式 Boundary 或 Module Contract。

## Repository Status

```text
Runtime Foundation Bootstrap Stage

Runtime Foundation: Implemented／Locally Verified
Phase 1 Core Modules: Locally Implemented／Locally Verified／Not Deployed
Phase 1 Physical Schema: Local D1 Only／Not Deployed
Phase 1 and Platform Service Migrations: Executed and Verified on Isolated Local D1
Remote Migration: Not Executed
Production Migration: Not Executed
Deployment: Not Performed
Production Verification: Not Verified
```

Runtime Phase 1 [Decision Closure](docs/runtime-phase-1/README.md)、五份 ADR、四份 Module Contract 與 Operational Endpoint Contract 已由 Tony 核准。Foundation 與 Operational Health／Readiness 已本機驗證；四個 Phase 1 Core Module 維持 Candidate，現為 Locally Implemented／Locally Verified／Not Deployed／Production Use Not Allowed。

## 1. 這套 Framework 是什麼

Platform Core Framework 是所有未來 SaaS Application 共用的架構母框架。它提供一致的身份、Tenant、Permission、Module Boundary、交易安全、資料治理與開發流程；它不屬於任何客戶，也不包含客戶專屬商業流程。願景與定位見 [Platform Vision](docs/00-VISION.md) 與 [Platform Blueprint](docs/01-PLATFORM-BLUEPRINT.md)。

## 2. 解決什麼問題

- 避免每個專案重做身份、會員、點數、推薦、權限與稽核。
- 避免 LINE、特定客戶或既有 Repository 成為平台核心。
- 讓功能以 Module、Adapter、Extension 與 Configuration 組裝。
- 在寫程式前先確認 Decision、Boundary、Contract、Data Ownership 與驗收。

適用於 Multi-Tenant、Multi-Country、Multi-Channel SaaS；個別 Application 仍須依需求選用 Module，不代表所有能力都要啟用。

## 3. 核心架構圖

```text
Users and Operators
        │
LINE / WhatsApp / Web / App / Other Channels
        │
Adapters
        │
Application / Tenant Configuration
        │
Extensions
        │
Domain Modules
        │
Platform Core
        │
Cloudflare Infrastructure
```

Channel 只負責輸入輸出適配；商業規則由 Application、Extension 或 Domain Module 承擔；跨專案底層規則才進 Platform Core。詳見 [Architecture Layers](docs/handbook/03-ARCHITECTURE-LAYERS.md)。

## 4. 五層架構

1. **Platform Core**：Identity、Tenant、Permission、跨領域安全與治理規範。
2. **Domain Module**：Point、Referral、Attribution、Attendance、Redemption 等具資料所有權的能力。
3. **Adapter**：隔離 LINE、WhatsApp、Login、OCR、AI、Storage Provider。
4. **Extension**：承載特定產業或 Tenant 的完整特殊流程。
5. **Application／Tenant Configuration**：組合 Module 並設定數值、開關、語系與 Policy。

正式依賴規則見 [Framework Layers](docs/10-FRAMEWORK-LAYERS.md)。

Domain Module 的現行實例包括 [Event Engine](docs/event-engine/README.md) 與 [Business Network Engine](docs/business-network/README.md)；兩者皆不屬於 Platform Core，且各自維持獨立 Contract 與 Lifecycle。

## 5. Identity 與 Tenant 模型

```text
Platform User
├── Identity Mapping
├── Tenant Membership A
│   ├── Shop Membership
│   ├── Point Account
│   ├── Referral Relationship
│   ├── CRM Relationship
│   └── Role Assignment
└── Tenant Membership B
    ├── Independent Point Account
    ├── Independent Referrer
    ├── Independent CRM Data
    └── Independent Permissions
```

登入成功不等於取得 Tenant Membership 或 Permission；同一 Platform User 在不同 Tenant 的點數、推薦、CRM 與角色互不污染。詳見 [Identity／Tenant／Membership](docs/handbook/04-IDENTITY-TENANT-MEMBERSHIP.md)。

## 6. 核心 Modules／Engines

Framework 已建立五個交易型 Candidate Contract：Point、Referral、Attribution、Attendance、Redemption。它們都是 `Candidate / Contract Proposed / Not Implemented / Not Verified`。其他 Engine 仍是架構候選或文件邊界；完整導覽見 [Module and Engine Map](docs/handbook/05-MODULE-ENGINE-MAP.md)。

## 7. Transaction Safety

每個狀態變更都要有 Atomic Intent、Tenant Scope、Permission、Business Reference、Idempotency、Stored Result、Audit 與 Correction Path。完成交易使用 Reverse／Correct／Adjust，不 Delete；Notification 失敗不回滾核心交易。詳見 [Transaction Safety](docs/handbook/06-TRANSACTION-SAFETY.md)。

## 8. Data Architecture

`main` 已納入 Sprint 6 Logical Model 與 Sprint 7 Physical D1 Schema Proposal。三項 Architecture Review Gate 均已通過，但只核准 Proposal Architecture Boundary；Schema／Migration 仍為 Not Executed／Not Verified，且未取得 Execution Approval。D1 是正式資料的 Source-of-Truth Decision，KV 只能作可重建 Cache。詳見 [Data Architecture](docs/handbook/07-DATA-ARCHITECTURE.md)。

## 9. Cloudflare Architecture

Cloudflare First 表示優先評估 Workers、D1、KV、R2、Queues、Cron、Durable Objects、AI Gateway 與 Cache，但不代表全部必須使用。每項服務只承擔適合的責任。詳見 [Cloudflare Architecture](docs/handbook/08-CLOUDFLARE-ARCHITECTURE.md)。

## 10. Governance 與 Development Workflow

```text
Problem
→ Read-only Audit
→ Proposal
→ ADR／Contract
→ Architecture Review
→ Implementation
→ Verification
→ Promotion
```

Tony 是 Architecture Owner。Accepted、Implemented、Verified、Stable 是不同狀態，不能互相推導。詳見 [Development Governance](docs/handbook/09-DEVELOPMENT-GOVERNANCE.md)。

## 11. AI／Codex 使用方式

Codex 在大型任務前必須確認 Repository、Branch、HEAD、Workspace，閱讀本 Handbook、相關 ADR、Contract 與 Data Boundary，再做 Read-only Audit 並回報 GO／NO-GO。詳見 [AI／Codex Working Guide](docs/handbook/10-AI-CODEX-WORKING-GUIDE.md)。

## 12. 新專案如何組裝

新 SaaS 從 Tenant Model、Module、Adapter、Extension 與 Configuration 開始，再完成 Contract、Data Boundary、Scenario Matrix 與 Schema Review；不能從舊專案直接 Copy。詳見 [Project Assembly Guide](docs/handbook/11-PROJECT-ASSEMBLY-GUIDE.md)。

## 13. 文件導航

- [Handbook 使用指南](docs/handbook/00-HANDBOOK-GUIDE.md)
- [Executive Overview](docs/handbook/01-EXECUTIVE-OVERVIEW.md)
- [Platform Mental Model](docs/handbook/02-PLATFORM-MENTAL-MODEL.md)
- [Legacy Asset Map](docs/handbook/12-LEGACY-ASSET-MAP.md)
- [Decision Status Map](docs/handbook/13-DECISION-STATUS-MAP.md)
- [角色閱讀路徑](docs/handbook/14-READING-PATHS.md)
- [Glossary](docs/handbook/15-GLOSSARY.md)
- [Open Decisions](docs/handbook/16-OPEN-DECISIONS.md)
- [Roadmap](docs/handbook/17-ROADMAP.md)
- [Runtime Phase 1 Decision Closure](docs/runtime-phase-1/README.md)
- [Platform Reliability Foundation](docs/platform-reliability/README.md)
- [Platform Observability Foundation](docs/platform-observability/README.md)
- [Platform Traffic Protection Foundation](docs/platform-traffic/README.md)
- [Framework 2.0 Roadmap](docs/FRAMEWORK-2.0-ROADMAP.md)
- [Repository 完整正式文件索引](README.md#文件索引)

## 14. 狀態說明

| 狀態 | 意義 | 不代表 |
| --- | --- | --- |
| Accepted | Architecture Owner 接受 Decision | Implemented、Verified |
| Proposed | 已提出、待審查 | Accepted、可部署 |
| Candidate | 正在評估的能力 | Stable、Production Ready |
| Implemented | 已完成指定實作 | Production Verified |
| Verified | 在指定 Scope 有證據 | 所有場景皆適用 |

集中狀態見 [Decision Status Map](docs/handbook/13-DECISION-STATUS-MAP.md)。

## 15. Roadmap

歷史 Sprint 與 RC1 治理狀態仍保留於原 Roadmap；目前可執行基準已包含本機驗證的 Runtime Foundation、Core Persistence、Event Engine 與 Business Network Engine。新的分層候選與 PR #18～#20 順序見 [Framework 2.0 Roadmap](docs/FRAMEWORK-2.0-ROADMAP.md)。任何 Local Verification 仍不代表 Remote D1、Deployment 或 Production Ready。

## 16. Framework RC1 and Migration Governance

[Framework RC1](docs/releases/RC1.md) 是 Architecture Release Candidate／Documentation Baseline，來源 commit 為 `6dd23c30dd496a4892660c71b33349c2695ecb67`。RC1 凍結 Accepted ADR 與三項 Physical Schema Gate 的架構邊界，但不宣稱 Runtime、Schema Execution、D1 Verification、Performance Verification 或 Production Readiness。

[Approved Migration Package Design](docs/migration-package/README.md) 是下一階段治理入口。閱讀順序為 Package Status → Dependency Order → Test Strategy → A01～A06 → Atomicity → Recovery／Reconciliation → 三項 Gate → Readiness → Promotion → Evidence → Go／No-Go。

目前 Package 決策固定為 **NO-GO — Execution Not Yet Approved**。Package Design merge、Architecture Approval、Security Approval、Execution Approval、Migration Execution 與 Post-Migration Verification 是獨立狀態；Tony 預設只擔任 Architecture Owner。

## 17. Runtime Phase 1 Boundary

Runtime Phase 1 只規劃 Identity Core、Tenant Access、Authorization、Core Operations 與 Operational Health Check。其 logical scope 限定 Platform User、Tenant、External Identity Mapping、Tenant Membership、Permission、Role、Role Assignment、Idempotency 與 Audit。

BookingOS、Booking、Appointment、Calendar、Brand、Shop、CRM、Point、Referral、Product、Coupon、AI Agent、LINE Messaging Adapter 與客戶專屬流程都不屬於本階段 Runtime。Handbook 的 BookingOS Candidate 描述不是 Runtime Implementation Source。

四份 Contract 與 ADR-013～ADR-017 已由 Tony 核准。Foundation Bootstrap 提供 request pipeline、operational endpoints、UUIDv7 與 safe error handling；後續 Phase 1 Core Persistence and Domain Foundation 已在隔離 Local D1 實作及驗證十張表、Repository、Domain Service、Audit、Idempotency 與 Authorization。它仍不提供公開 Domain API、Remote D1、Binding、Secret、Deployment 或 Production。正式入口與 current truth 見 [Runtime Phase 1](docs/runtime-phase-1/README.md)。

## 18. Platform Reliability Foundation

[Platform Reliability Foundation](docs/platform-reliability/README.md) 定義三環境隔離、可追蹤 Release、程式退版與資料復原分離、Provider-neutral Backup／Restore、Deployment Gates 與 safe release health。它是 Platform Service，不是 Business Engine。

PR #18 的 Contract 已由 Tony 核准，Architecture／Security Review 已通過；Lifecycle 維持 Platform Service Candidate。證據只限 Local／CI 與隔離 Local D1。Local Filesystem 是測試 Adapter；R2、Google Drive 與外部 Object Storage 都維持 Disabled。沒有 Remote D1、Secret、Binding、Provider API、部署或 Production 使用權。

## 19. Platform Observability Foundation

[Platform Observability](docs/platform-observability/README.md) defines bounded Observation Events, deterministic failure classification, Tenant/provider/platform Incident aggregation, three-level diagnostics, Support Codes, dependency health, and provider-neutral alert intent. It is a Platform Service, not business analytics or a Business Engine.

PR #19 status is Platform Service Candidate／Contract Approved by Tony／Architecture Review Approved／Security Review Approved／Locally Implemented／Locally Verified／Not Deployed／Production Use Not Allowed. Sidecar failures cannot change completed business results; Observation retention is governed, bounded, audited, and idempotent while Incident history remains immutable. Telegram and AI adapters remain Disabled. There is no Remote D1, provider API, credential, Binding, public Admin UI, scheduler, deployment, or Production verification. Traffic protection remains separate PR #20 scope.
## 20. Platform Traffic Protection Foundation

[Platform Traffic Protection](docs/platform-traffic/README.md) defines the trusted admission pipeline, webhook deduplication, rate decisions, Tenant resource isolation, circuit breaker, load shedding, backpressure, and bounded abuse evidence. It is a Platform Service, not a Business Engine and not a billing authority.

Current status is Platform Service Candidate, Contract Approved by Tony, Architecture Review Approved, Security Review Approved, Locally Implemented, Locally Verified, Not Deployed, and Production Use Not Allowed. Verification is limited to deterministic local adapters and isolated Local D1. No Remote D1, Cloudflare Rate Limiting API, Durable Object, Queue, Cron, provider credential, Binding, deployment, or Production verification exists.
## Application Assembly Reading Path

Application 組裝與可選模組治理請從 [Application Assembly](docs/application-assembly/README.md) 開始，再閱讀 [Access Guard](docs/application-assembly/05-MODULE-ACCESS-GUARD.md) 與 [Security](docs/application-assembly/07-SECURITY.md)。此能力目前為 Platform Service Candidate、Contract Approved by Tony、Architecture Review Approved、Security Review Approved、Locally Implemented、Locally Verified、Not Deployed、Production Use Not Allowed。
