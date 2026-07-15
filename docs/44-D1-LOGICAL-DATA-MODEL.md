# D1 Logical Data Model

> Logical Design Proposal · No SQL · No D1 Schema · No Migration · Not Implemented

## 目的與狀態

本文件把既有 Domain Model、Module Contract 與 Accepted ADR 轉換為 D1 實作前可審查的邏輯資料藍圖。文件中的 Logical Record、Key、Constraint 與 Access Pattern 都是語意要求，不是資料表、欄位、資料型別、DDL 或已核准的實體 Schema。

- Design Status：Proposed
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Source of Truth Decision：[ADR-002](adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md)
- Architecture Approval：Pending

## 設計原則

1. D1 保存需要關聯、一致性、歷史與稽核的正式資料；KV 只作可重建 Cache。
2. Platform Identity 與 Tenant Business Data 分離。
3. 所有 Tenant Domain Record 都必須可直接判定 Tenant Scope；Brand／Shop 只能限縮，不能取代 Tenant。
4. 每個 Logical Record 只有一個 Owner Module；其他 Module 透過 Query、Command 或 Domain Event 協作。
5. External Provider Identity、公開 Token、URL 與顯示名稱不得作 Business Primary Key。
6. 完成交易與歷史關係不物理覆寫；Reverse、Correct、Replace、Merge 與 Anonymize 保留關聯。
7. 唯一性、Idempotency、Permission 與 Scope 必須在寫入邊界共同成立。

## Logical Record Catalog

| Domain | Logical Record | Owner | Tenant Scope | 歷史策略 |
| --- | --- | --- | --- | --- |
| Identity | Platform User | Identity Center | Platform | Lifecycle／Merge／Anonymize 保留 |
| Identity | Identity Mapping | Identity Center | Provider Context；非 Tenant Permission | Link／Unlink／Conflict 保留 |
| Organization | Tenant／Brand／Shop | Tenant Manager | Tenant 為根 | 停用與移動需 Audit |
| Membership | Tenant Membership／Shop Membership | Membership Engine | Required | 停用、恢復、合併保留 |
| Permission | Role／Permission／Role Assignment | Permission Engine | Assignment 決定 Scope | Grant／Revoke／Expire 保留 |
| Point | Point Program／Account／Ledger Entry | Point Engine | Required | 只保存已成立交易；Reverse／Adjust 為正式 Entry |
| Referral | Referral Relationship | Referral Engine | Required | Replace／Correct 保留舊關係 |
| Attribution | Share Link／Touch／Attribution Record | Attribution Engine | Required | Evidence 與 Decision 版本化 |
| Attendance | Attendance Subject／Record | Attendance Engine | Required | Confirm／Reject／Correct／Revoke 保留 |
| Redemption | Redemption Intent／Result | Redemption Engine | Required | Cancel／Reject／Complete／Reverse 保留 |
| Core Candidate | Idempotency Record | Platform Core Candidate | Required for tenant commands | 狀態與 Stored Result 保留至 Retention 到期 |
| Core Candidate | Audit Record | Platform Core Candidate | Platform 或 Tenant | Append-only；依法定 Policy 管理 |

## 關係規則

```text
Platform User ──< Identity Mapping
Platform User ──< Tenant Membership >── Tenant
Tenant ──< Brand? ──< Shop?
Tenant Membership ──< Shop Membership >── Shop
Tenant Membership ──< Point Account ──< Point Transaction
Tenant Membership ──< Referral Relationship
Share Link ──< Attribution Touch ──> Attribution Record ──> Conversion Reference
Tenant Membership ──< Attendance Record
Tenant Membership ──< Redemption Intent ──> Point Transaction Reference
Command ──1 Idempotency Record
Sensitive Change ──1..n Audit Record
```

- `?` 表示選用組織層級；不是 Nullable 規格。
- Conversion、Order、Campaign、Event 等外部 Module 資料只保存穩定 Business Reference，不複製其 Owned Data。
- Logical Foreign Reference 必須同時驗證 Owner、Tenant 與 Lifecycle；存在關係不等於授權。

## Logical Key Classes

| Key Class | 用途 | 禁止事項 |
| --- | --- | --- |
| Internal Identity | 穩定識別 Logical Record | 不暴露 Provider Secret 或可猜測 PII |
| Tenant Scope Key | 強制隔離 Tenant Domain Data | 不以 Shop 單獨取代 Tenant |
| Business Reference | 連結 Attendance、Order、Redemption、Migration 等事實 | 不只用 Timestamp、URL 或 External UID |
| Provider Reference | 在驗證 Context 中解析外部事件或身份 | 不直接操作 Point／Membership |
| Idempotency Key | 防止相同 Intent 重複產生效果 | 不由未驗證 Client 完整決定 Scope |
| Correlation Reference | 串聯跨 Module Command／Event／Audit | 不代表 Transaction Atomicity |

## 一致性邊界

- 單一 Aggregate 的狀態、唯一性與 Idempotency 結果應在同一明確寫入意圖內完成。
- 跨 Module 不假設分散式 Transaction；以 Stored Result、Domain Event、Reconciliation 與 Compensation 協作。
- Point Transaction Ledger 只保存已成立並正式影響、抵消或調整點數資產的 Entry；Rejected／Failed Point Intent 不得進入 Ledger。
- Rejected／Failed Point Intent 由 Idempotency Record、Command Result、必要 Audit Record 與依用途保存的 Application／Security Log 承接。
- Point Balance 只由有效 Ledger Entry 推導；任何 Projection／Cache 都必須可重建。
- Notification、Analytics 或 Cache 更新失敗不得改寫已完成核心交易結果。

## 實體設計前必須補齊

- D1 實際 Table／Column／Type／Constraint／Index Proposal。
- 量測後的 Query、容量、競爭、分頁與 Retention 需求。
- Transaction Boundary、Failure Recovery 與 Backfill 設計。
- Migration／Rollback／Reconciliation 計畫與測試證據。
- PII Classification、Encryption、Access、Export、Erasure 與 Legal Hold 決策。
- Architecture Owner 對 Breaking Boundary 與新 ADR 的批准。

相關文件：[Database Standard](05-DATABASE-STANDARD.md)、[Tenant Data Boundary](15-TENANT-DATA-BOUNDARY.md)、[Domain Invariants](30-DOMAIN-INVARIANTS.md)、[Transaction Safety](39-TRANSACTION-SAFETY-STANDARD.md)。
