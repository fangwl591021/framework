# RC1 Migration Test Catalog

> Design correction for PR #9 findings. Every row is **Planned**. This catalog is not authorization to create, access, or execute a D1 database.

## Catalog Contract

- Each case uses a versioned synthetic fixture, fixed seed, approved isolated target, setup manifest, cleanup manifest, and immutable Run ID.
- A case may be approved only after its exact command reference, error code, affected-row assertion, before/after digest, and re-run rule are filled in the corresponding implementation record.
- `TBL-*` proves table primitives. `REG-*` proves Gate 1–3 architecture regressions. `Q-*` proves query/index design only; it does not claim measured performance.

## 29-table and domain traceability

| Test ID | Proposal table | Domain | Required primitives / assertions | Test types | Status |
| --- | --- | --- | --- | --- | --- |
| TBL-01 | platform_users | Identity | PK, lifecycle/history, required fields | Positive, Negative | Planned |
| TBL-02 | tenants | Organization | PK, tenant root uniqueness, lifecycle | Positive, Negative | Planned |
| TBL-03 | brands | Organization | tenant FK, nullable hierarchy scope | Positive, Tenant Isolation | Planned |
| TBL-04 | shops | Organization | tenant/brand FK, canonical scope | Positive, Tenant Isolation | Planned |
| TBL-05 | identity_mappings | Identity | provider identity, active partial unique index | Positive, Negative, Replay | Planned |
| TBL-06 | tenant_memberships | Membership | user/tenant FK, active partial unique index | Positive, Negative, Concurrency | Planned |
| TBL-07 | shop_memberships | Membership | tenant/shop/member scope, active partial unique index | Positive, Tenant Isolation | Planned |
| TBL-08 | permissions | Permission | PK, immutable permission key | Positive, Negative | Planned |
| TBL-09 | roles | Permission | tenant scope, unique role key / lifecycle | Positive, Negative | Planned |
| TBL-10 | role_permissions | Permission | role/permission composite FK and duplicate prevention | Positive, Negative | Planned |
| TBL-11 | role_assignments | Permission | canonical scope, active partial unique index | Positive, Negative, Concurrency | Planned |
| TBL-12 | point_programs | Point | tenant FK, active program constraints | Positive, Tenant Isolation | Planned |
| TBL-13 | point_accounts | Point | account scope, active account unique indexes | Positive, Negative, Concurrency | Planned |
| TBL-14 | point_transactions | Point Ledger | FK, CHECK, account-version/effect/reverse uniqueness, triggers | Positive, Negative, Replay, Concurrency | Planned |
| TBL-15 | point_balance_projections | Point Ledger | account FK, balance/version/watermark guard | Positive, Negative, Recovery | Planned |
| TBL-16 | referral_invitations | Referral | tenant scope, issuer/recipient references, expiry state | Positive, Negative | Planned |
| TBL-17 | referral_relationships | Referral | tenant member relation, active partial unique index | Positive, Negative, Concurrency | Planned |
| TBL-18 | share_links | Attribution | token unique index, tenant scope, expiry | Positive, Negative, Replay | Planned |
| TBL-19 | attribution_touches | Attribution | share link FK, time window, retention marker | Positive, Negative, Query | Planned |
| TBL-20 | conversions | Attribution | tenant scope and business conversion reference | Positive, Tenant Isolation | Planned |
| TBL-21 | attribution_records | Attribution | conversion FK, active partial unique index | Positive, Negative, Concurrency | Planned |
| TBL-22 | events | Attendance | tenant scope, event lifecycle | Positive, Negative | Planned |
| TBL-23 | event_sessions | Attendance | event FK, time/location/online mode constraints | Positive, Negative | Planned |
| TBL-24 | attendance_attempts | Attendance | session/member FK, evidence minimization | Positive, Security | Planned |
| TBL-25 | attendance_records | Attendance | active unique index, tenant/session/member scope | Positive, Negative, Replay | Planned |
| TBL-26 | redemption_intents | Redemption | business reference unique index, tenant scope/idempotency relation | Positive, Negative, Replay | Planned |
| TBL-27 | redemption_results | Redemption | intent FK, receipt index, terminal state | Positive, Negative, Recovery | Planned |
| TBL-28 | idempotency_records | Platform Core | platform/tenant namespace indexes, fingerprint/generation/status | Positive, Replay, Concurrency | Planned |
| TBL-29 | audit_records | Platform Core | scope/resource indexes, sanitized audit content | Positive, Security, Query | Planned |

## Gate regression and cross-table cases

| Test ID | Source | Required final-state proof | Status |
| --- | --- | --- | --- |
| REG-01 | Gate 1 active-only uniqueness | exactly one active row in each affected canonical scope; failed insert changes zero rows | Planned |
| REG-02 | Gate 2 canonical scope key | same logical scope cannot bypass active uniqueness through nullable/shop scope variation | Planned |
| REG-03 | Gate 3 projection atomicity | accepted effect changes transaction and projection together; rejected effect changes neither | Planned |
| A01–A06 | point transaction triggers | exact error class, zero affected committed rows, stable projection/ledger/idempotency counts | Planned |
| AT-01 | complete batch rollback | injected statement failure leaves every listed touched table at before-state digest | Planned |
| RP-01 | same-key replay | one domain effect; replay returns stored result and leaves counts unchanged | Planned |
| RP-02 | fingerprint conflict | conflict result, zero new domain effect, original stored result unchanged | Planned |
| CC-01 | competing point deduction | exactly one winner or both reject; no negative balance or version gap | Planned |
| RC-01 | interrupted backfill | resumable checkpoint, no duplicate/history loss, reconciliation exit criteria met | Planned |
| RC-02 | trigger/constraint deployment drift | hash mismatch stops promotion before data phase; no automatic repair | Planned |

## Primitive completion rule

The individual case implementation must enumerate all PK, FK, CHECK, UNIQUE/partial UNIQUE, index, and trigger names from the proposal hash it tests. A catalog row is not completed merely because a similarly named table exists.
