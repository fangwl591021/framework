# Query / Index Test Design

> This is a planned design. It does not state that D1 query performance or index usage has been tested.

| Test ID | Query intent | Required filters / order | Candidate index | Evidence | Fresh / Seeded |
| --- | --- | --- | --- | --- | --- |
| Q-01 | member shop memberships | tenant + member, active, cursor order | `idx_shop_memberships_member` plus active predicate | sanitized query plan, returned IDs/count, order proof | Both |
| Q-02 | role assignments by subject | tenant + subject, active | `idx_role_assignments_subject` plus active predicate | plan, count, cross-tenant denial | Both |
| Q-03 | account transaction timeline | account + time cursor | `idx_point_transactions_account_time` | plan, cursor continuity, result count | Both |
| Q-04 | business-reference effect lookup | tenant + business ref | `idx_point_transactions_business_ref` | plan, one-effect uniqueness proof | Both |
| Q-05 | reverse-chain lookup | original transaction | `idx_point_transactions_original` | plan, chain cardinality | Both |
| Q-06 | referral history | tenant + referred member + time | `idx_referral_relationships_history` | plan, active/history separation | Both |
| Q-07 | attribution window selection | tenant + touch time/window | `idx_attribution_touches_window` | plan, window boundary proof | Both |
| Q-08 | conversion attribution lookup | conversion reference | `idx_attribution_records_conversion` | plan, one active attribution proof | Both |
| Q-09 | attendance member timeline | tenant + member + time | `idx_attendance_records_member_time` | plan, cursor continuity | Both |
| Q-10 | idempotency expiry sweep | status + expiry | `idx_idempotency_status_expiry` | plan, bounded candidate count | Seeded |
| Q-11 | audit resource history | scope/resource + time | audit scope/resource time indexes | plan, tenant filter and cursor proof | Seeded |

For each implemented case, capture the exact query text reference, parameters as sanitized type/value class, query-plan output, expected and actual rows, cursor rule, tenant boundary proof, and write-cost observation. A write-cost observation is descriptive only until a separately approved performance threshold exists.
