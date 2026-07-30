# Runtime Phase 1 Decision Closure

> Approved architecture baseline. This approval record does not itself implement or authorize SQL, Migration, D1 or production execution.
>
> Current Foundation implementation status is tracked separately in [Core Foundation Status](08-CORE-FOUNDATION-STATUS.md).

## Decision Status

| Dimension | Status |
| --- | --- |
| Architecture Owner | Tony |
| Decision Selection | Approved by Tony |
| Architecture Approval | Approved by Tony |
| Approval Reference | PR #12 |
| Runtime at Decision Approval | Not Implemented |
| D1／Migration | Not Executed／Not Verified |
| Deployment | Not Deployed |

The choices below are the approved Runtime Phase 1 architecture baseline. After this Decision Closure PR is merged, they open only a separate Foundation Bootstrap PR; they do not authorize Runtime coding in this PR or any SQL, Migration, D1, Secret, Binding or production action.

## 1. ID Strategy

- Every Phase 1 core Entity ID uses UUIDv7.
- D1 will store the value as `TEXT`; this statement is logical scope, not a schema definition.
- APIs do not expose sequential IDs as Domain IDs.
- External Identity is never a Business Key.
- An Application／Domain Service generates UUIDv7 before repository persistence.
- Repository and D1 do not generate Domain IDs.
- `crypto.randomUUID()` produces UUIDv4 and is not a UUIDv7 substitute.

See [ADR-013](../adr/ADR-013-UUIDV7-CORE-ENTITY-IDS.md).

## 2. Platform User Lifecycle

The only formal Phase 1 states are:

```text
active
suspended
merged
anonymized
```

- `deleted` is not a Platform User state.
- PII removal uses irreversible `anonymized`.
- `merged` preserves a canonical Platform User reference.
- A merged user cannot authenticate directly or create a new Membership.
- An anonymized user cannot return to `active`.
- Merge and anonymization do not delete required Audit or historical references.

## 3. External Identity Lifecycle and Security

The formal Identity Mapping states are:

```text
active
revoked
conflict
```

`Pending` and `Verified` belong to the credential-verification workflow and are not persisted as formal Identity Mapping states. An `active` mapping can be created only after verification.

- Revocation preserves history.
- Conflict never triggers automatic relinking.
- Linking requires a verified Credential or a controlled Internal Administration Command.
- Raw LINE／Google／Apple or other Provider Subject values are not stored.
- `subject_digest` uses HMAC-SHA-256 over an unambiguous, versioned encoding of Provider, Issuer／Context and Subject.
- Each mapping preserves `digest_key_version`.
- Phase 1 includes no LINE／Google／Apple Provider Adapter.

Logical mapping identity consists of:

```text
provider
issuer_context
subject_digest
digest_key_version
```

Key rotation cannot rely on a single database Unique Constraint because the same identity produces a different digest under a new key. Rotation must resolve against active and permitted previous key versions, link the new digest to the existing Platform User, and prevent creation of a second Platform User within one controlled operation.

See [ADR-014](../adr/ADR-014-EXTERNAL-IDENTITY-SUBJECT-DIGEST.md).

## 4. Tenant Membership Lifecycle

The formal Phase 1 states are:

```text
active
suspended
closed
merged
```

- `invited` and `pending` belong to a future Invitation Module.
- Phase 1 Membership does not implement an invitation workflow.
- A merged Membership preserves a canonical Membership reference and history.
- `closed` and `merged` Memberships never authorize Tenant operations.

## 5. Tenant Context and Administration

- A Tenant API route `tenantId` defines Resource Scope.
- The authenticated Credential and current Role Assignment must authorize the same Tenant.
- A client-provided header is not a trusted Tenant selector.
- Any Route Tenant, Credential Tenant or Resource Tenant mismatch is denied without disclosing cross-tenant resource existence.
- Every tenant-scoped Repository method requires `tenantId`; no convenience method may omit it.
- Platform-level operations use a separate Internal Administration Boundary and never impersonate a Tenant API.
- There is no public bootstrap endpoint.
- The first registrant never becomes an administrator automatically.
- A future one-time, auditable Administration Command creates a Service Principal or Platform Administrator.
- Tenant and Platform User write interfaces remain internal-only until Security and Execution Gates pass.
- Platform Administrator is not a Tenant Role.

See [ADR-015](../adr/ADR-015-TENANT-CONTEXT-INTERNAL-ADMIN.md).

## 6. Role and Permission Vocabulary

Core Role identifiers:

```text
tenant_owner
tenant_admin
tenant_member
```

Core Permission identifiers:

```text
tenant:read
tenant:update
membership:read
membership:manage
role:read
role:manage
platform_user:read_self
external_identity:read_self
```

- Core Role Templates are system-managed and immutable to Tenants.
- Authentication grants no Tenant Permission by itself.
- `tenant_member` initially receives only basic self-read permissions.
- A Tenant Custom Role can combine only approved Permissions.
- A Tenant must retain at least one effective `tenant_owner`; ordinary administration cannot remove or disable the last owner.
- Role scope is normalized as `core` or `tenant`.
- A Core Role has no `tenant_id`.
- A Tenant Custom Role requires `tenant_id`, cannot cross Tenants and cannot use a reserved Core Role identifier.

See [ADR-017](../adr/ADR-017-PHASE-1-LIFECYCLE-AUTHORIZATION-VOCABULARY.md).

## 7. Audit and Idempotency

Audit and Idempotency are required Phase 1 cross-cutting infrastructure for:

- Identity Linking
- Membership Mutation
- Role Assignment Mutation
- Tenant Mutation

An Idempotency Record logically contains operation scope, nullable Tenant and Actor references, idempotency key, request fingerprint, processing state, safe Stored Result, resource reference and expiration. Same key and fingerprint returns the Stored Result; same key with a different fingerprint is rejected. `in_progress` requires timeout, ownership recovery and stale-owner protection. Full request payloads are prohibited.

An Audit Record supports actor types `platform_user`, `service_principal` and `system`, and minimally records actor reference, action, resource reference, nullable Tenant, result, reason code, correlation ID and creation time.

Stored Results and Audit summaries must exclude Secrets, Tokens, Authorization headers, raw Provider Subjects, full request／response payloads and unnecessary PII snapshots.

See [ADR-016](../adr/ADR-016-PHASE-1-AUDIT-IDEMPOTENCY.md).

## 8. Phase 1 Logical Schema Scope

The logical storage scope is limited to:

```text
platform_users
tenants
identity_mappings
tenant_memberships
permissions
roles
role_permissions
role_assignments
idempotency_records
audit_records
```

This is a naming and ownership boundary only. It does not define SQL, columns, constraints, indexes, migrations or D1 execution.

## 9. Explicit Exclusions

Phase 1 excludes Brand, Shop, Shop Membership, Booking, Appointment, Calendar, CRM, Point, Referral, Product, Coupon, AI Agent, LINE Messaging Adapter and customer-specific workflows.

BookingOS is not part of Platform Core Runtime. Existing Handbook candidate assembly descriptions are not Runtime implementation sources. Candidate-description cleanup, if desired, belongs to a separate documentation PR.

## 10. QA Governance Boundary

- PR #9 through PR #11 remain an independent QA Governance workstream.
- Their unmerged content is not included in this branch.
- Runtime work starts from the latest clean `main`.
- Migration／D1 work waits for the relevant QA Governance and Test Plan Gates.
- A Runtime bootstrap and Health Check do not require Migration Execution Approval, but still require their own approved scope and verification.

## 11. Conflict Analysis

No existing Accepted ADR is superseded:

- ADR-001 remains the identity／membership separation authority.
- ADR-003 remains the Modular Monolith Worker direction, while Runtime remains unimplemented.
- ADR-004 continues to allow optional Brand／Shop globally; Phase 1 merely excludes them from its initial slice.
- ADR-008 remains the prohibition against External Identity as a Business Key.

ADR-013 through ADR-017 are Accepted additions approved by Tony in PR #12. They do not modify the historical text or Accepted status of ADR-001 through ADR-012.

## 12. Remaining Open Decisions

The following remain outside this closure:

- Physical timestamp representation.
- Shared versus dedicated D1 topology.
- Audit and Idempotency retention periods.
- Exact UUIDv7 library and conformance test vectors.
- Exact canonical byte encoding for the HMAC input.
- Secret provider, rotation operator and recovery ceremony.
- Service Principal credential mechanism.
- Runtime route names and transport DTOs.

These questions must be resolved at the relevant Security, Runtime or Migration Gate; none authorizes implementation in this PR.

## 13. Post-Approval Gate

- Runtime Foundation Bootstrap: GO only as a separate PR after Decision Closure merge.
- Runtime coding in this PR: NO-GO.
- SQL／Migration／D1／Secret／Binding／Production: NO-GO.
- Module lifecycle remains Candidate; Implementation and Verification remain negative.
