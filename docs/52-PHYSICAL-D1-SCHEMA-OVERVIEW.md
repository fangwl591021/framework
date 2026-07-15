# Physical D1 Schema Overview

> Proposal Only · Do Not Execute

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

本文件把 Sprint 6 Logical Model 映射為第一版 D1／SQLite Physical Proposal。SQL、Table、Column、Constraint 與 Index 都尚未對 D1 執行或驗證。

## Shared Physical Choices

- **Internal ID**：`TEXT` opaque internal ID；UUID／ULID／CUID2 的 generator 仍待 ADR。不得用 Provider UID、Email、Phone 或公開 Token 作 PK。
- **Time**：`INTEGER` Unix milliseconds、UTC。Tenant timezone 只用於顯示與 Business Window 計算。
- **Status**：穩定基礎狀態使用 `TEXT + CHECK`；高變動商業狀態留在 Contract／Transaction Validation。
- **Tenant Scope**：所有 Tenant Domain Table 直接保存 `tenant_id`；重要 parent 使用 composite FK 或同一 Transaction 驗證防止 scope drift。
- **History**：Ledger、Referral／Attribution History、Attendance、Redemption、Audit、Completed Idempotency 與 Merge History 不作一般 Hard Delete。
- **Source of Truth**：D1 是正式資料候選；KV 只作可重建 Cache。

## Internal ID Comparison

| Candidate | Sortability | Collision／Distribution | Exposure／Index／Migration | Proposal Status |
| --- | --- | --- | --- | --- |
| UUID v4 | random | mature distributed generation | hard to guess；TEXT index較大且不具時間 locality | Candidate |
| ULID | time-sortable | distributed；需處理同毫秒排序 | 可暴露大致時間；TEXT index locality較佳 | Candidate |
| CUID2 | generally not time-sortable | distributed／collision-resistant design | opaque；長度與 D1 index cost需量測 | Candidate |
| Other opaque TEXT | depends on generator | 必須提供 entropy／collision evidence | 必須支援 URL safety與 migration stability | Candidate |

本 Sprint 只批准 storage envelope：`TEXT opaque internal ID`；exact generator、長度與排序性待 ADR，不實作 generator。

## Time Storage Comparison

| Candidate | Sort／Precision | Readability／SQLite | Timezone／Migration | Proposal Status |
| --- | --- | --- | --- | --- |
| `INTEGER` Unix milliseconds | numeric sort；millisecond | compact；date functions需明確 conversion | UTC instant；易作 range／index；跨語言需防 unit drift | Proposed |
| `TEXT` ISO-8601 UTC | lexicographic only under canonical format | human-readable；format／fraction規則需固定 | UTC suffix必要；格式 migration成本較高 | Alternative |

本 Proposal 採 `INTEGER` Unix milliseconds UTC；Tenant local timezone 不入正式 instant，只參與顯示與 Business Window 計算。

## Table Catalog

| Table | Owner／Boundary | Purpose | Scope | PK／Parent | History／PII | Write／Read Pattern |
| --- | --- | --- | --- | --- | --- | --- |
| `platform_users` | Identity Center | 平台主體 | Platform | `id` | lifecycle；Restricted | low write／identity resolve |
| `identity_mappings` | Identity Center | Provider identity link | Provider context | `id` → user | link history；Restricted | medium write／provider resolve |
| `tenants` | Tenant Manager | 隔離根節點 | Tenant | `id` | deactivate；Internal | low write／scope resolve |
| `brands` | Tenant Manager | 選用品牌節點 | Tenant | `id` → tenant | deactivate；Internal | low write／tenant list |
| `shops` | Tenant Manager | 選用營運節點 | Tenant | `id` → tenant／brand? | deactivate；Internal | low write／scope resolve |
| `tenant_memberships` | Membership Engine | User–Tenant 關係 | Tenant | `id` → user／tenant | lifecycle；Restricted | medium write／member resolve |
| `shop_memberships` | Membership Engine | Membership–Shop 關係 | Tenant＋Shop | `id` → membership／shop | revoke；Restricted | medium write／shop list |
| `roles` | Permission Engine | Normalized Core／Tenant role | Platform／Tenant | `tenant_scope_key + id` | versioned；Internal | low write／permission resolve |
| `permissions` | Permission Engine | 固定 permission vocabulary | Platform | `id` | additive；Internal | rare write／lookup |
| `role_permissions` | Permission Engine | Scope-bound Role–Permission map | Platform／Tenant | scope＋role＋permission | replace history by version；Internal | low write／permission check |
| `role_assignments` | Permission Engine | Scope-bound subject role grant | explicit Core／Tenant／Brand／Shop | `id` → scoped role | grant／revoke；Restricted | medium write／hot permission read |
| `point_programs` | Point Engine | Point policy container | Tenant | `id` → tenant | versioned；Internal | low write／program resolve |
| `point_accounts` | Point Engine | Membership point account | Tenant＋optional Shop | `id` → membership／program | freeze／close；Restricted | medium write／account resolve |
| `point_transactions` | Point Engine | Formal asset ledger | Tenant＋Account | `id` → account | append-only；Financial-like | append-heavy／history lookup |
| `point_balance_projections` | Point Engine | Rebuildable balance | Tenant＋Account | account PK | replaceable；Restricted | hot write／hot read |
| `referral_invitations` | Referral Engine | Invite token envelope | Tenant | `id` → inviter | revoke／expire；Restricted | medium write／token resolve |
| `referral_relationships` | Referral Engine | Direct referrer history | Tenant | `id` → two memberships | replace／revoke；Restricted | low write／active lookup |
| `share_links` | Attribution Engine | Share token envelope | Tenant | `id` → promoter | revoke／expire；Restricted | medium write／token resolve |
| `attribution_touches` | Attribution Engine | Interaction evidence | Tenant | `id` → share? | retention／archive；Restricted | high write／window query |
| `conversions` | Attribution Engine reference envelope | External business reference；not Order data | Tenant | `id` | immutable reference；Internal | medium write／conversion resolve |
| `attribution_records` | Attribution Engine | Versioned decision | Tenant | `id` → conversion／touch? | correct／reverse；Restricted | medium write／active lookup |
| `events` | Attendance minimal reference stub | Attendance subject envelope；not full Event Module | Tenant | `id` | deactivate；Internal | low write／reference resolve |
| `event_sessions` | Attendance minimal reference stub | Session window envelope | Tenant | `id` → event | deactivate；Internal | medium write／session resolve |
| `attendance_attempts` | Attendance Engine | success／failed verification attempts | Tenant | `id` → session／member | retention／archive；Restricted | high write／security review |
| `attendance_records` | Attendance Engine | Formal attendance result | Tenant | `id` → session／member | correct／revoke；Restricted | medium write／history |
| `redemption_intents` | Redemption Engine | Pending transaction intent | Tenant＋Shop | `id` → member | expire／cancel；Restricted | medium write／intent resolve |
| `redemption_results` | Redemption Engine | completed／rejected result | Tenant＋Shop | `id` → intent | reverse／correct；Financial-like | medium write／receipt lookup |
| `idempotency_records` | Platform Core Candidate | Scope-separated Winner／Stored Result | Platform／Tenant | `id`＋Tenant composite target | retention by risk；Restricted | hot write／replay lookup |
| `audit_records` | Platform Core Candidate | Minimal decision／change evidence | Platform／Tenant／Brand／Shop | `id` | append-only／archive；Restricted | append-heavy／scoped search |

**Table count: 29.** `events`、`event_sessions` 與 `conversions` 只是必要 reference envelope，不代表 Framework 接管完整 Event、Order 或 Commerce schema。

## Proposal Files

- [Identity／Membership](53-IDENTITY-MEMBERSHIP-PHYSICAL-SCHEMA.md)
- [Point Ledger](54-POINT-LEDGER-PHYSICAL-SCHEMA.md)
- [Referral／Attribution](55-REFERRAL-ATTRIBUTION-PHYSICAL-SCHEMA.md)
- [Attendance／Redemption](56-ATTENDANCE-REDEMPTION-PHYSICAL-SCHEMA.md)
- [Audit／Idempotency](57-AUDIT-IDEMPOTENCY-PHYSICAL-SCHEMA.md)
- [SQL Proposal Index](schema/proposals/001-core-identity-membership.sql)

## Unresolved Architecture Decisions

Internal ID generator、time representation final approval、active-only uniqueness、partial reverse、projection update、D1 topology 與 retention periods 尚未批准；見 [Review Checklist](63-PHYSICAL-SCHEMA-REVIEW-CHECKLIST.md)。
