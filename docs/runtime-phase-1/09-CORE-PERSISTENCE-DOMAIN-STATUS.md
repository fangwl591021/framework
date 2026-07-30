# Runtime Phase 1 Core Persistence and Domain Foundation

> Candidate modules are locally implemented and locally verified against an isolated Local D1 runtime. They are not deployed, are not production-ready, and expose no public API.

## Authority and Scope

This implementation reconciles the accepted ADR-013 through ADR-017 contracts with a deliberately smaller Phase 1 physical model. The earlier broad Physical D1 Proposal remains historical design input; its unrelated Brand, Shop, Point, Referral, Attribution, Attendance and Redemption records are not copied into this migration.

The executable migration is `migrations/0001_phase_1_core.sql`. It is used only by the Cloudflare Workers Vitest integration and Miniflare Local D1 binding `DB`. There is no Wrangler deployment configuration, account identifier, remote binding, secret, or production database access.

## Current Status

| Capability | Status |
| --- | --- |
| Identity Core | Candidate / Contract Approved / Locally Implemented / Locally Verified |
| Tenant Access | Candidate / Contract Approved / Locally Implemented / Locally Verified |
| Authorization | Candidate / Contract Approved / Locally Implemented / Locally Verified |
| Core Operations | Candidate / Contract Approved / Locally Implemented / Locally Verified |
| Local D1 Migration | Implemented / Executed Locally / Verified Locally |
| Remote or Production D1 | Not Accessed / Not Approved |
| Deployment | Not Deployed |
| Production Use | Not Allowed |

## Physical Model

The migration creates exactly ten application tables:

1. `platform_users`
2. `tenants`
3. `identity_mappings`
4. `tenant_memberships`
5. `permissions`
6. `roles`
7. `role_permissions`
8. `role_assignments`
9. `idempotency_records`
10. `audit_records`

All entity IDs are application-generated UUIDv7 values stored as `TEXT`. Timestamps are UTC Unix milliseconds stored as `INTEGER`. Foreign keys are enabled. Tenant-scoped repositories require `tenantId`; no repository convenience method performs an unscoped Tenant-domain lookup.

## Index and Constraint Map

| Table | Important index or constraint | Purpose |
| --- | --- | --- |
| `platform_users` | terminal-state trigger and merge FK | Prevent anonymized recovery and invalid merge targets |
| `identity_mappings` | `uq_identity_mappings_active` | One active provider / issuer / digest identity |
| `identity_mappings` | `idx_identity_mappings_user` | Bounded active mappings by Platform User |
| `tenant_memberships` | `(tenant_id, id)` and tenant-aware merge FK | Prevent cross-Tenant merge references |
| `tenant_memberships` | `uq_tenant_memberships_active` | One active Membership per User and Tenant |
| `tenant_memberships` | `idx_tenant_memberships_tenant_status` | Tenant roster and lifecycle lookup |
| `roles` | `uq_roles_core_key`, `uq_roles_tenant_key` | Separate Core and Tenant role namespaces |
| `roles` | `(tenant_scope_key, id)` | Composite role-scope reference boundary |
| `role_permissions` | composite primary key | Prevent duplicate Permission grants |
| `role_assignments` | tenant-aware Membership FK and role-scope FK | Prevent cross-Tenant assignments |
| `role_assignments` | `uq_role_assignments_active` | One active assignment per role and member |
| `role_assignments` | `idx_role_assignments_member` | Single-query Permission evaluation |
| `idempotency_records` | separate platform and tenant unique indexes | Prevent NULL scope ambiguity and duplicate effects |
| `idempotency_records` | `idx_idempotency_tenant_expiry` | Bounded recovery and retention scan |
| `audit_records` | `idx_audit_tenant_time` | Bounded Tenant audit timeline |
| `audit_records` | `idx_audit_resource_time` | Bounded resource history |

The last active `tenant_owner` is protected by database triggers on both Role Assignment revocation and Membership lifecycle change. Application checks improve error clarity; database constraints remain the final winner.

## Local Technical Decisions

- Identity subject canonicalization is length-prefixed UTF-8 under `identity-subject-v1`.
- Identity digests use versioned HMAC-SHA-256 keys injected through `IdentityDigestKeyProvider`.
- Resolution checks the current key then explicitly configured previous keys. Raw subject values are never stored.
- Idempotency keys are SHA-256 hashed before persistence. Request fingerprints use recursively key-sorted canonical JSON plus SHA-256.
- Stored Results are bounded to 4096 bytes. Platform and Tenant uniqueness spaces are separate partial indexes.
- A mutation uses one D1 `batch()` containing the Idempotency claim, domain statements, minimal Audit record and completed Stored Result. D1 batch failure rolls the complete mutation back.
- A processing record cannot exist during normal service execution because claim and completion are in one atomic batch. Explicit stale-record recovery uses an expired lease and generation compare-and-set before a retry.
- Audit stores only safe actor, action, resource, decision, reason and correlation references. It has no request payload, identity subject, before snapshot or after snapshot columns.
- Permission evaluation uses one bounded join query; it does not load roles or permissions in an N+1 loop.

## Local Verification

The Local D1 suite covers fresh rebuild, repeat application through the D1 migration ledger, FK enforcement, active uniqueness, seed counts, User-to-Permission flow, Tenant isolation, idempotency replay/conflict/stale recovery, identity key rotation, raw-subject absence, last-owner protection, terminal lifecycle states, minimal Audit, and query-plan index evidence.

Existing Runtime Foundation tests continue to cover UUIDv7 and `/health` / `/ready`. These endpoints intentionally do not claim D1 or production readiness.

## Explicit Exclusions

No Booking, Appointment, Calendar, CRM, Point, Referral, Product, Coupon, AI Agent, Provider Adapter, LINE Messaging, Admin UI, public Domain API, remote D1 write, production binding, secret, deployment, or customer-specific workflow is included.