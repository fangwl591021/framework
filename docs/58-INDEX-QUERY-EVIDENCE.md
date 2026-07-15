# Index and Query Evidence

> Proposal Only · Indexes Not Benchmarked · Performance Not Verified

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

每個 Index Candidate 必須服務具名 Query。欄位存在不構成建立 index 的理由；最終順序需以 target D1 上的 `EXPLAIN QUERY PLAN`、row cardinality、write cost 與 pagination 測試批准。

## Query Matrix

| Query ID | Owner Module | Business Query | Table | Filter | Sort | Expected Cardinality | Frequency | Tenant Scope | Index Candidate | Covering Need | Write Cost | Retention Impact | Evidence Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Q01 | Identity | Provider resolve | `identity_mappings` | provider＋context＋subject hash＋active | none | unique row | high | provider context | `uq_identity_mappings_active` | no | active-link uniqueness | revoked history grows index | Not Verified |
| Q02 | Membership | Tenant membership resolve | `tenant_memberships` | tenant＋user＋active | none | unique row | high | required | `uq_tenant_memberships_active` | no | lifecycle uniqueness | closed history retained | Not Verified |
| Q03 | Membership | Shop membership list | `shop_memberships` | tenant＋membership＋status | `id` cursor | low／medium | medium | required | `idx_shop_memberships_member` | no | membership writes | revoked rows retained | Not Verified |
| Q04 | Permission | Effective assignment check | `role_assignments` | tenant＋subject＋status＋effective time | `id` | low | very high | explicit | `idx_role_assignments_subject` | policy fields may require row read | grant／revoke hot path | expired history grows index | Not Verified |
| Q05 | Point | Account resolve | `point_accounts` | tenant＋membership＋program＋scope＋active | none | unique row | high | required | `uq_point_accounts_active` | no | account lifecycle uniqueness | closed accounts retained | Not Verified |
| Q06 | Point | Ledger history | `point_transactions` | tenant＋account | `occurred_at DESC, id DESC` | high | high | required | `idx_point_transactions_account_time` | no | append index cost | ledger history retained | Not Verified |
| Q07 | Point | Business reference lookup | `point_transactions` | tenant＋business type＋reference | none | low | high | required | `idx_point_transactions_business_ref` | operation／rule require row read | append index cost | ledger history retained | Not Verified |
| Q08 | Point | Reverse chain | `point_transactions` | tenant＋original transaction | `occurred_at, id` | low | medium | required | `idx_point_transactions_original` | no | append index cost | reverse history retained | Not Verified |
| Q09 | Referral | Active referrer | `referral_relationships` | tenant＋member＋active | none | unique row | high | required | `uq_referral_relationships_active` | no | lifecycle uniqueness | replaced history retained | Not Verified |
| Q10 | Referral | Referral history | `referral_relationships` | tenant＋member | `confirmed_at DESC, id DESC` | low | medium | required | `idx_referral_relationships_history` | no | lifecycle index | relationship history retained | Not Verified |
| Q11 | Attribution | Share token resolve | `share_links` | tenant＋token hash | none | unique row | high | required | `uq_share_links_token` | status／expiry require row read | token write uniqueness | revoked token retention | Not Verified |
| Q12 | Attribution | Touch window | `attribution_touches` | tenant＋share link＋occurred range | `occurred_at DESC, id DESC` | high | high | required | `idx_attribution_touches_window` | no | high-write hot index | archive changes cardinality | Not Verified |
| Q13 | Attribution | Conversion decision | `attribution_records` | tenant＋conversion＋active | none | unique row | high | required | `uq_attribution_records_active` | decision fields require row read | decision uniqueness | corrected history retained | Not Verified |
| Q14 | Attendance | Duplicate confirmation | `attendance_records` | tenant＋session＋member＋active | none | unique row | high burst | required | `uq_attendance_records_active` | no | check-in burst uniqueness | attendance history retained | Not Verified |
| Q15 | Attendance | Member history | `attendance_records` | tenant＋member | `confirmed_at DESC, id DESC` | medium | medium | required | `idx_attendance_records_member_time` | no | record index | archive policy changes size | Not Verified |
| Q16 | Redemption | Intent resolve | `redemption_intents` | tenant＋business reference | none | low／unique candidate | high | required | `uq_redemption_intents_business_ref` | status requires row read | intent uniqueness | expired intent retention | Not Verified |
| Q17 | Redemption | Receipt lookup | `redemption_results` | tenant＋receipt reference | none | unique candidate | medium | required | `idx_redemption_results_receipt` | no | nullable index write | result history retained | Not Verified |
| Q18 | Platform Core Candidate | Idempotency replay | `idempotency_records` | scope＋operation＋key hash | none | unique row | very high | explicit scope | `uq_idempotency_scope_operation_key` | result requires row read | hot claim／result write | risk-based expiry | Not Verified |
| Q19 | Platform Core Candidate | Audit search | `audit_records` | tenant＋resource／time range | `occurred_at DESC, id DESC` | very high | medium | tenant filter required | `idx_audit_records_scope_time`＋`idx_audit_records_resource_time` | no | append-heavy indexes | archive changes search set | Not Verified |

## Composite Order and Pagination

- Equality scope fields first, range／sort time next, stable `id` last for keyset cursor.
- High-volume history 禁止深度 OFFSET 作預設；cursor 使用 `(occurred_at, id)`。
- Covering index 只在 row-read evidence 證明收益後新增；本 Sprint 不提出重複 covering indexes。
- `attribution_touches`、`attendance_attempts`、`point_transactions`、`idempotency_records`、`audit_records` 是 write-heavy／append-heavy，index 數量需最小化。
- Archive／retention 會改變 cardinality 與 index size；切換 archive 前重新量測。

## Evidence Gap

19 個 Query 均只有 Contract／logical evidence，沒有 D1 query plan、production cardinality、latency 或 write amplification evidence。Sprint 7 不宣稱任何 index 已驗證。
