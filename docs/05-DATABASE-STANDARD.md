# Database Standard

## 文件範圍

本文件定義資料概念、Scope、Source of Truth 與治理原則。Sprint 6 另以 [D1 Logical Data Model](44-D1-LOGICAL-DATA-MODEL.md) 描述 Logical Record、關係、唯一性候選與 Access Pattern；兩者都不建立資料表、欄位型別、實體索引、SQL、Physical Schema 或 Migration。

## Identity and Membership Concepts

### Platform User

代表自然人或平台主體，不直接保存特定 Tenant、Brand 或 Shop 的 Point、Referral、CRM、等級與福利。

### Identity Mapping

將 LINE、Google、Apple、Facebook、WhatsApp、Email、Mobile 等 Provider Identity 連結至 Platform User。Identity Mapping 不授予 Tenant Permission。

### Tenant Membership

代表 Platform User 在特定 Tenant 的業務會員關係，是 Point、Referral、CRM 與福利的預設歸屬基礎。

### Shop Membership

代表 Platform User 或 Tenant Membership 在特定 Shop 的參與關係，不取代 Tenant Membership，也不自動取得整個 Tenant Permission。

身份決策見 [ADR-001](adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md)。

## Organization Concepts

### Tenant

必要層級，代表 SaaS 客戶、公司、組織或企業帳戶，是主要資料與 Permission 隔離邊界。

### Brand

Tenant 底下的選用層級，代表品牌、產品線、子品牌或事業單位。

### Shop

Tenant 或 Brand 底下的選用層級，代表門市、分店、據點或線上營運單位。Shop 不得成為 Platform User。

組織決策見 [Organization Hierarchy](22-ORGANIZATION-HIERARCHY.md) 與 [ADR-004](adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md)。

## Domain Data Concepts

### Transaction

可稽核的業務異動事實，需具來源、時間、狀態、Tenant Scope、Idempotency 與不可任意覆寫的歷史。

### Point

Point Account 與 Point Transaction 屬於 Tenant Domain。每次增加、扣除、到期或調整都必須可追溯，不能只保存最終餘額。

概念關係為 `Tenant Membership + Point Program + Optional Shop Scope = Point Account`。Balance 由 Ledger 推導；Reverse 建立反向 Transaction，Adjust 必須有高權限與 Audit。詳見 [Point Account Model](26-POINT-ACCOUNT-MODEL.md)。

### Event

平台內發生的領域事實，用於 Module 協作、通知、稽核或分析；需具類型、版本、來源、Tenant Scope 與時間。

### Relationship

Platform User、Tenant Membership、Shop Membership 或其他資源之間具有方向、類型、Scope 與有效期間的關係。

Referral Relationship 是 Tenant 內的長期直接關係；Attribution Touch 是行銷互動；Attribution Record 是單一 Conversion 的版本化最終判定，三者不可共用一個可覆寫欄位。詳見 [Referral Relationship Model](27-REFERRAL-RELATIONSHIP-MODEL.md) 與 [Attribution Model](28-ATTRIBUTION-MODEL.md)。

## Conceptual Model, Not Schema

- 本 Sprint 所列 `provider_subject`、Status、Reference、Rule Version、Idempotency Key 等都只是概念資料。
- Aggregate Root、Entity、Value Object、Policy、Event、Command 與 Query 的選擇必須先於 Schema。
- Lifecycle 狀態不是資料庫 Enum；Correction、Merge、Reverse 與 Migration 必須保留歷史。
- Schema Proposal 需逐項證明 Owner Module、Tenant Scope、Business Reference、Invariant 與 Migration 方法。

## Source of Truth

依 [ADR-002](adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md)：

- D1 是 Membership、Point、Attendance、Referral、Attribution、Order、Redemption、Approval 與需要一致性 Configuration 的 Source of Truth。
- KV 只可作 Cache、低頻設定讀取加速、Feature Flag 快速讀取或可容忍延遲的資料副本。
- Cache Miss 必須能回到 D1；KV 與 D1 不一致時，以 D1 為準。
- Point Balance、Point Transaction、Attendance 成功與重複贈點判斷不得只寫 KV。

## Owned Data and Read-only External Data

- 每個 Domain Module 必須在 Module Contract 宣告 Owned Data。
- 只有 Owner Module 可直接建立、修改或刪除 Owned Data。
- 其他 Module 只能透過公開 Query Interface 取得 Read-only External Data。
- 取得副本不轉移資料擁有權，也不得繞過 Tenant Boundary。

## 治理原則

- 每筆 Tenant Domain Data 都必須能判定 Tenant Scope。
- Brand／Shop Scope 不能取代 Tenant Scope。
- Identity Mapping 與 Business Membership 分離。
- Point、Referral、CRM 與 Permission 異動必須有 Audit 要求。
- PII 依最小必要範圍保存並定義 Retention、Deletion 與 Access Policy。
- 時間資料保留明確時區語意，跨國顯示由 Application 轉換。
- Schema Change 必須引用已批准 Boundary、Module Contract 與 ADR，另案設計 Migration 及 Rollback。

## 未來模型前置條件

1. 完成 Domain Responsibility、Owned Data 與 Public Interface。
2. 完成 Platform User、Identity Mapping、Tenant Membership 與 Shop Membership Boundary。
3. 完成 Tenant、Brand、Shop 與跨 Shop Policy。
4. 完成 Audit Log、Idempotency、Permission、PII 與 Retention 要求。
5. 完成容量、Query、一致性、Migration 與 Rollback 評估。

## Sprint 6 Logical Design Boundary

- Logical Record 表達 Domain 語意與 Owner，不等於 D1 Table。
- Logical Key／Reference 表達穩定識別需求，不決定 Column Name、Type 或生成算法。
- Uniqueness／Integrity Candidate 表達必須維護的不變條件，不批准 SQL Constraint 或 Index。
- Access Pattern 是未來容量、排序、分頁與 Index Proposal 的輸入，不代表已完成效能設計。
- Retention Class 只列治理問題；未經 Privacy／Security／Domain Owner 核准前不指定保存期間。
- Physical Schema、Migration、Repository Runtime 與 Production Verification 必須通過 [Schema Implementation Readiness Checklist](51-SCHEMA-IMPLEMENTATION-READINESS-CHECKLIST.md) 後另案進行。
## Cross-module Concept References

未來每個歷史型 Entity／Aggregate 必須概念性標明：

- **Business Reference**：跨 Module 的穩定業務參考，不是 Provider Identity。
- **Rule Version**：建立結果時使用的 Point／Referral／Attribution Policy 版本。
- **Idempotency Key**：在 Tenant、Command 與 Business Reference Boundary 內防止重複建立。
- **Audit Reference**：連結 Actor、Reason、Evidence 與批准紀錄。
- **Historical State**：保留 Reverse、Replaced、Merged、Reversed、Corrected 等前後狀態，不直接覆寫歷史。

以上仍是概念要求，不是 SQL 欄位、型別或索引設計。

## Sprint 7 Physical Proposal Principles

- Logical Model 定義 Domain ownership／invariant；Physical Proposal 才提出 Table、Column、SQLite Type、Constraint 與 Index，但仍不是 Implemented Schema。
- ID 採 opaque TEXT proposal，exact generator pending ADR；不得以 Provider UID、Email、Phone 或公開 token 作 PK。
- Business time 採 UTC Unix millisecond INTEGER proposal；Tenant local timezone 只作顯示與 window calculation。
- 穩定 status vocabulary 可用 TEXT + CHECK；高變動 business state 仍由 Contract／Transaction Validation。
- FK 與 composite tenant FK 需要 relationship evidence；D1 foreign key enforcement 不取代 application permission／lifecycle validation。
- Index 必須引用 [Query Evidence](58-INDEX-QUERY-EVIDENCE.md)，並在 target D1 以 query plan、cardinality、latency 與 write cost 驗證。
- Migration 優先 additive，採 Expand–Migrate–Verify–Switch–Contract；constraint tightening 前掃描 violation，backfill 必須 resumable／idempotent。
- Point Ledger、Audit、Referral／Attribution History、Attendance、Redemption、Completed Idempotency 與 Merge History 禁止一般 Hard Delete／Cascade Delete。
- SQL Proposal 與 draft SQL 都位於 docs/schema/，不得由 Wrangler 執行。

## Logical Model References

- [Identity and Membership Logical Model](45-IDENTITY-MEMBERSHIP-LOGICAL-MODEL.md)
- [Point Ledger Logical Model](46-POINT-LEDGER-LOGICAL-MODEL.md)
- [Referral and Attribution Logical Model](47-REFERRAL-ATTRIBUTION-LOGICAL-MODEL.md)
- [Attendance and Redemption Logical Model](48-ATTENDANCE-REDEMPTION-LOGICAL-MODEL.md)
- [Audit and Idempotency Logical Model](49-AUDIT-IDEMPOTENCY-LOGICAL-MODEL.md)
- [Data Integrity and Retention Matrix](50-DATA-INTEGRITY-RETENTION-MATRIX.md)

## Physical Proposal References

- [Physical D1 Schema Overview](52-PHYSICAL-D1-SCHEMA-OVERVIEW.md)
- [Index and Query Evidence](58-INDEX-QUERY-EVIDENCE.md)
- [Transaction Boundary Proposal](59-TRANSACTION-BOUNDARY-PROPOSAL.md)
- [Migration and Rollback Strategy](60-MIGRATION-ROLLBACK-STRATEGY.md)
- [Reconciliation and Backfill Strategy](61-RECONCILIATION-BACKFILL-STRATEGY.md)
- [D1 Capacity and Retention Plan](62-D1-CAPACITY-RETENTION-PLAN.md)
- [Physical Schema Review Checklist](63-PHYSICAL-SCHEMA-REVIEW-CHECKLIST.md)
