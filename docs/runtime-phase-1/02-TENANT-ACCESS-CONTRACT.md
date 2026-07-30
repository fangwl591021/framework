# Tenant Access Module Contract

> Contract Defined · Pending Approval · Not Implemented · Not Verified · Not Deployed

## 1. Basic Information

| Field | Value |
| --- | --- |
| Module Name | Tenant Access |
| Module ID | `tenant-access` |
| Purpose | Own Tenant and Tenant Membership boundaries and enforce trusted Tenant Context |
| Non-goals | Brand, Shop, invitations, CRM, Point, Referral and authorization policy ownership |
| Business Capability | Establish a Tenant and one Platform User relationship within that Tenant |
| Lifecycle Status | Candidate |
| Owner | Unassigned |
| Version | `0.1.0-draft` |
| Approval Status | Contract Defined — Pending Tony approval |

## 2. Dependencies

| Field | Value |
| --- | --- |
| Dependencies | Identity Core queries; Authorization decisions; Core Operations Audit／Idempotency／Correlation |
| Adapter Dependencies | None |
| Minimum／Maximum Core Version | N/A／N/A |

## 3. Public Interface

| Type | Contract |
| --- | --- |
| Interfaces | `TenantService v1`, `TenantMembershipService v1`, `TenantContextResolver v1` |
| Commands | `CreateTenant`, `UpdateTenant`, `CreateTenantMembership`, `SuspendTenantMembership`, `CloseTenantMembership`, `MergeTenantMembership` |
| Queries | `GetTenant`, `GetTenantMembership`, `FindActiveMembership`, `ResolveTenantContext` |
| Events Published | `TenantCreated`, `TenantUpdated`, `TenantMembershipCreated`, `TenantMembershipSuspended`, `TenantMembershipClosed`, `TenantMembershipMerged` |
| Events Consumed | `PlatformUserSuspended`, `PlatformUserMerged`, `PlatformUserAnonymized` |

No tenant-scoped public query or command may omit `tenantId`.

## 4. Domain and Data Boundary

| Field | Value |
| --- | --- |
| Owned Data | Tenant; Tenant Membership |
| Aggregate Roots | Tenant; Tenant Membership |
| Identity Reference Type | Platform User, Service Principal |
| Business Reference | UUIDv7 Tenant ID and Tenant Membership ID |
| Read-only External Data | Platform User status; current authorization decision |
| Tenant Boundary | Tenant ID is mandatory for every Membership operation |
| Shop Boundary | Not applicable in Phase 1 |
| Logical Storage Scope | `tenants`, `tenant_memberships` |
| Migration Requirements | Separate approved Migration Package required |

Brand, Shop and Shop Membership remain valid optional Framework concepts under ADR-004 but are excluded from the Phase 1 implementation slice.

## 5. Lifecycle and Invariants

Tenant Membership states are `active`, `suspended`, `closed`, `merged`.

- Invitation states and workflows belong to a future Invitation Module.
- A Platform User has at most one active Membership per Tenant.
- A suspended Membership grants no normal Tenant mutation.
- Closed or merged Membership grants no Tenant Permission.
- Merge preserves source, canonical target, Actor, reason, correlation and history.
- A merged Platform User cannot receive a new Membership.
- Membership data never merges across Tenants.

Historical correction uses Suspend, Close or Merge; records are not hard-deleted to hide history.

## 6. Tenant Context Enforcement

- Route `tenantId` is Resource Scope, not proof of authority.
- Credential and current Role Assignment must authorize the same Tenant.
- Resource Tenant is validated before returning or mutating data.
- Any mismatch is denied without resource enumeration.
- Client headers never establish trusted Tenant Context.
- Repository methods require `tenantId` and apply it in the data predicate.
- Platform administration uses the separate Internal Administration Boundary.

## 7. Permission, Idempotency and Audit

| Concern | Requirement |
| --- | --- |
| Permissions | `tenant:read`, `tenant:update`, `membership:read`, `membership:manage` |
| Idempotency | Required for Tenant and Membership mutations; scope includes operation and Tenant |
| Audit | Tenant create／update; Membership create／suspend／close／merge; boundary denial where required |
| Actor | Platform User or Service Principal with current authority |
| Stored Result | Safe status and resource reference only; no complete payload |

The operation that creates the first Tenant owner must be an Internal Administration Command and atomically preserve the last-owner invariant with Authorization.

## 8. Error, Retry and Observability

Errors: Validation, Authentication, Permission, Tenant Scope, Duplicate, Conflict, Invalid State, Not Found and Temporary Dependency. Retried mutations reuse the original Idempotency Key. Metrics and logs preserve correlation and Tenant reference but exclude unnecessary PII.

## 9. Configuration and Extension

| Field | Value |
| --- | --- |
| Configuration | None approved for Phase 1 |
| Policies | Membership merge and closure authorization |
| Strategies | Tenant Context resolution behind a stable port |
| Feature Flags | None approved |
| Extension Points | Future Invitation Module command boundary; no Phase 1 implementation |

## 10. Testing and Compatibility

Required tests: cross-tenant read/write denial, missing-tenant repository contract rejection, same-user multi-Tenant isolation, one active Membership winner, lifecycle authorization, merged-user rejection, canonical Membership merge and last-owner preservation.

Breaking changes require MAJOR version and Architecture Owner approval. Deprecation requires a replacement contract and migration window.

## 11. Status and History

| Review | Status |
| --- | --- |
| Module Owner | Unassigned／Pending |
| Platform Architect | Pending |
| Architecture Owner | Tony／Pending |
| Implementation | Not Implemented |
| Verification | Not Verified |
| Production | Not Deployed |

| Version | Date | Change | Approval |
| --- | --- | --- | --- |
| `0.1.0-draft` | 2026-07-30 | Initial Runtime Phase 1 contract | Pending |

## 12. Open Questions

| Question | Owner | Needed By | Status |
| --- | --- | --- | --- |
| Tenant creation naming and reserved-name policy | Tenant Owner | Runtime implementation | Open |
| Membership history retention | Privacy／Tenant Owner | Migration approval | Open |

ADR references: [ADR-001](../adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md), [ADR-004](../adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md), [ADR-015](../adr/ADR-015-TENANT-CONTEXT-INTERNAL-ADMIN.md), [ADR-017](../adr/ADR-017-PHASE-1-LIFECYCLE-AUTHORIZATION-VOCABULARY.md).
