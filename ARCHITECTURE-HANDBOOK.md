# Platform Core Framework — Architecture Handbook

> Framework 的最高層理解與導航入口。Handbook 是摘要，不取代 Accepted ADR、正式 Boundary 或 Module Contract。

## Repository Status

```text
Architecture and Documentation Stage

Runtime: Not Implemented
Physical Schema: Not Implemented
Migration: Not Executed
Deployment: Not Performed
Production Verification: Not Verified
```

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

`main` 已有 Sprint 6 Logical Model；D1 是正式資料的 Source-of-Truth Decision，KV 只能作可重建 Cache。Sprint 7 Physical D1 Schema Proposal 的三項 Architecture Gate 已通過，但仍在 [Draft PR #6](https://github.com/fangwl591021/framework/pull/6) 等待最終審查，狀態為 Not Executed／Not Verified；尚未在 `main` 批准或實作，不得視為正式基準。詳見 [Data Architecture](docs/handbook/07-DATA-ARCHITECTURE.md)。

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

Sprint 1～6 已建立文件基礎；Sprint 7 Architecture Gates 已通過，但 Draft PR 仍等待最終審查，且 Not Executed／Not Verified。本 Handbook 只新增理解與導航層，不批准 Runtime、Physical Schema 執行、Migration 或 Deployment。後續候選順序見 [Roadmap](docs/handbook/17-ROADMAP.md)。
