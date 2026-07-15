# Handbook Guide

> 導航文件 · 以 `main` 的 Sprint 1～6 文件為正式基準 · 不代表 Runtime 存在

## 如何使用

本 Handbook 讓不同角色快速建立共同背景，再前往正式 ADR、Boundary、Contract 或 Model。它不取代正式決策；摘要與正式文件衝突時，依下列 Source of Truth 優先順序處理：

1. Accepted ADR
2. Approved Architecture Boundary
3. Module Contract
4. Logical／Physical Design
5. Handbook Summary
6. Project Notes
7. AI Generated Explanation

未標示 Accepted 的內容不得視為正式決策；Contract Proposed 不等於 Approved；Handbook 不代表 Runtime、Schema、Migration 或 Deployment 已存在。每次重大 Sprint 合併後都要檢查 Handbook 狀態與導航。

## 讀者入口

| 讀者 | 先讀 | 目的 |
| --- | --- | --- |
| Architecture Owner | [主 Handbook](../../ARCHITECTURE-HANDBOOK.md) → [Decision Status](13-DECISION-STATUS-MAP.md) → [Open Decisions](16-OPEN-DECISIONS.md) | 批准與優先順序 |
| Product Owner | [Executive Overview](01-EXECUTIVE-OVERVIEW.md) → [Mental Model](02-PLATFORM-MENTAL-MODEL.md) → [Assembly](11-PROJECT-ASSEMBLY-GUIDE.md) | 能力與邊界 |
| Engineer | [Layers](03-ARCHITECTURE-LAYERS.md) → [Module Map](05-MODULE-ENGINE-MAP.md) → [Transaction Safety](06-TRANSACTION-SAFETY.md) | 實作前背景 |
| AI／Codex | [AI Working Guide](10-AI-CODEX-WORKING-GUIDE.md) → relevant ADR／Contract → Checklist | 執行與停止條件 |
| Tenant Operator | [Mental Model](02-PLATFORM-MENTAL-MODEL.md) → [Identity／Membership](04-IDENTITY-TENANT-MEMBERSHIP.md) | Scope 與 Permission |
| Business Partner | [Executive Overview](01-EXECUTIVE-OVERVIEW.md) → [Legacy Asset Map](12-LEGACY-ASSET-MAP.md) | 應用可能性與非承諾 |
| New Team Member | [Reading Paths](14-READING-PATHS.md) | 30 分鐘、2 小時或完整路徑 |

## 正式文件導航

### Foundation

[Vision](../00-VISION.md) · [Blueprint](../01-PLATFORM-BLUEPRINT.md) · [Feature Asset Map](../02-FEATURE-ASSET-MAP.md) · [Development Standard](../03-DEVELOPMENT-STANDARD.md) · [Cloudflare Standard](../04-CLOUDFLARE-STANDARD.md) · [Database Standard](../05-DATABASE-STANDARD.md) · [Identity Center](../06-IDENTITY-CENTER.md) · [Engine Design](../07-ENGINE-DESIGN.md) · [AI Rule](../08-AI-DEVELOPMENT-RULE.md) · [Project Checklist](../09-PROJECT-CHECKLIST.md)

### Governance

[Framework Layers](../10-FRAMEWORK-LAYERS.md) · [Module Lifecycle](../11-MODULE-LIFECYCLE.md) · [Version／Dependency](../12-VERSION-DEPENDENCY-RULES.md) · [ADR Template](../13-ADR-TEMPLATE.md) · [Promotion Standard](../14-MODULE-PROMOTION-STANDARD.md) · [Tenant Boundary](../15-TENANT-DATA-BOUNDARY.md) · [Configuration／Extension](../16-CONFIGURATION-EXTENSION-RULES.md) · [Legacy Extraction](../17-LEGACY-ASSET-EXTRACTION.md) · [Architecture Ownership](../18-ARCHITECTURE-OWNERSHIP.md) · [Module Contract Standard](../19-MODULE-CONTRACT-STANDARD.md) · [Module Registry Standard](../20-MODULE-REGISTRY-STANDARD.md) · [Core Candidates](../21-CORE-CROSSCUTTING-CANDIDATES.md) · [Organization Hierarchy](../22-ORGANIZATION-HIERARCHY.md)

### Domain Models

[Core Domain](../23-CORE-DOMAIN-MODEL.md) · [Identity Mapping](../24-IDENTITY-MAPPING-MODEL.md) · [Membership](../25-MEMBERSHIP-MODEL.md) · [Point Account](../26-POINT-ACCOUNT-MODEL.md) · [Referral](../27-REFERRAL-RELATIONSHIP-MODEL.md) · [Attribution](../28-ATTRIBUTION-MODEL.md) · [Role／Permission](../29-ROLE-PERMISSION-SCOPE.md) · [Domain Invariants](../30-DOMAIN-INVARIANTS.md) · [Lifecycle State](../31-LIFECYCLE-STATE-MODEL.md) · [Duplicate／Merge／Migration](../32-DUPLICATE-MERGE-MIGRATION.md) · [Scenario Validation](../33-SCENARIO-VALIDATION-MATRIX.md)

### Transaction Contracts and Safety

[Point Contract](../34-POINT-ENGINE-CONTRACT.md) · [Referral Contract](../35-REFERRAL-ENGINE-CONTRACT.md) · [Attribution Contract](../36-ATTRIBUTION-ENGINE-CONTRACT.md) · [Attendance Contract](../37-ATTENDANCE-ENGINE-CONTRACT.md) · [Redemption Contract](../38-REDEMPTION-ENGINE-CONTRACT.md) · [Transaction Safety](../39-TRANSACTION-SAFETY-STANDARD.md) · [Idempotency](../40-IDEMPOTENCY-STANDARD.md) · [Correction／Reversal](../41-CORRECTION-REVERSAL-STANDARD.md) · [Integration Matrix](../42-ENGINE-INTEGRATION-MATRIX.md) · [Transaction Scenarios](../43-TRANSACTION-SCENARIO-MATRIX.md)

### D1 Logical Design

[D1 Logical Model](../44-D1-LOGICAL-DATA-MODEL.md) · [Identity／Membership Logical](../45-IDENTITY-MEMBERSHIP-LOGICAL-MODEL.md) · [Point Ledger Logical](../46-POINT-LEDGER-LOGICAL-MODEL.md) · [Referral／Attribution Logical](../47-REFERRAL-ATTRIBUTION-LOGICAL-MODEL.md) · [Attendance／Redemption Logical](../48-ATTENDANCE-REDEMPTION-LOGICAL-MODEL.md) · [Audit／Idempotency Logical](../49-AUDIT-IDEMPOTENCY-LOGICAL-MODEL.md) · [Integrity／Retention](../50-DATA-INTEGRITY-RETENTION-MATRIX.md) · [Schema Readiness](../51-SCHEMA-IMPLEMENTATION-READINESS-CHECKLIST.md)

### Accepted ADR、Registry、Templates

[ADR-001](../adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md) · [ADR-002](../adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md) · [ADR-003](../adr/ADR-003-MODULAR-MONOLITH-WORKER.md) · [ADR-004](../adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md) · [ADR-005](../adr/ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md) · [ADR-006](../adr/ADR-006-TENANT-SCOPED-POINT-ACCOUNTS.md) · [ADR-007](../adr/ADR-007-SINGLE-LAYER-REFERRAL-DEFAULT.md) · [ADR-008](../adr/ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md) · [ADR-009](../adr/ADR-009-REJECT-INSUFFICIENT-POINT-BALANCE.md) · [ADR-010](../adr/ADR-010-FIRST-VALID-REFERRER.md) · [ADR-011](../adr/ADR-011-DEFAULT-FIRST-TOUCH-ATTRIBUTION.md) · [ADR-012](../adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md)

[Point Registry](../registry/point-engine.md) · [Referral Registry](../registry/referral-engine.md) · [Attribution Registry](../registry/attribution-engine.md) · [Attendance Registry](../registry/attendance-engine.md) · [Redemption Registry](../registry/redemption-engine.md) · [Contract Template](../templates/MODULE-CONTRACT-TEMPLATE.md) · [Registry Template](../templates/MODULE-REGISTRY-ENTRY-TEMPLATE.md)

完整 Repository 索引亦見 [README](../../README.md#文件索引)。
