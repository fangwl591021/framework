# Authorization Module Contract

> Contract Approved · Approved by Tony · Locally Implemented · Locally Verified · Not Deployed

## 1. Basic Information

| Field | Value |
| --- | --- |
| Module Name | Authorization |
| Module ID | `authorization` |
| Purpose | Evaluate explicit Permission from governed Role and Role Assignment scope |
| Non-goals | Authentication, Platform User lifecycle, Membership ownership and UI visibility |
| Business Capability | Decide whether an Actor may perform an Action on a Resource in a Scope |
| Lifecycle Status | Candidate |
| Owner | Unassigned |
| Version | `0.1.0-draft` |
| Approval Status | Approved |

## 2. Dependencies

| Field | Value |
| --- | --- |
| Dependencies | Identity Core status; Tenant Access Membership status; Core Operations Audit／Idempotency／Correlation |
| Adapter Dependencies | None |
| Minimum／Maximum Core Version | N/A／N/A |

## 3. Public Interface

| Type | Contract |
| --- | --- |
| Interfaces | `AuthorizationDecisionService v1`, `RoleAdministrationService v1` |
| Commands | `CreateTenantCustomRole`, `AssignRole`, `RevokeRoleAssignment`, `UpdateTenantCustomRolePermissions` |
| Queries | `Authorize`, `GetEffectivePermissions`, `GetRole`, `ListApprovedPermissions` |
| Events Published | `TenantRoleCreated`, `TenantRolePermissionsChanged`, `RoleAssigned`, `RoleAssignmentRevoked` |
| Events Consumed | Membership suspension／closure／merge events; Platform User suspension／merge／anonymization events |

## 4. Domain and Data Boundary

| Field | Value |
| --- | --- |
| Owned Data | Permission vocabulary; Core Role Template; Tenant Custom Role; Role Permission mapping; Role Assignment |
| Aggregate Roots | Role; Role Assignment |
| Identity Reference Type | Platform User, Tenant Membership, Service Principal |
| Business Reference | UUIDv7 Role or Role Assignment ID |
| Read-only External Data | Platform User status; Tenant Membership status; trusted Tenant Context |
| Tenant Boundary | Tenant role and assignment always carry and validate one Tenant |
| Shop Boundary | Not applicable in Phase 1 |
| Logical Storage Scope | `permissions`, `roles`, `role_permissions`, `role_assignments` |
| Migration Requirements | Separate approved Migration Package required |

## 5. Vocabulary and Invariants

Core Roles: `tenant_owner`, `tenant_admin`, `tenant_member`.

Core Permissions: `tenant:read`, `tenant:update`, `membership:read`, `membership:manage`, `role:read`, `role:manage`, `platform_user:read_self`, `external_identity:read_self`.

- Role `scope_type` is `core` or `tenant`.
- Core Roles have no `tenant_id`, are system-managed and cannot be changed by Tenants.
- Tenant Custom Roles require `tenant_id`, can use only approved Permissions and cannot use Core Role identifiers.
- Authentication grants no Permission.
- Platform Administrator is outside Tenant Roles.
- A Tenant must retain at least one effective `tenant_owner`.
- Ordinary management cannot revoke, suspend or otherwise remove the last effective owner.
- A suspended, closed or merged Membership cannot authorize a Tenant operation.
- Authorization evaluates Actor, Action, Resource, Route Tenant, Resource Tenant and Assignment Scope for every protected operation.

## 6. Core Role Grants

| Core Role | Initial Permission Set |
| --- | --- |
| `tenant_owner` | All eight approved Phase 1 Permissions |
| `tenant_admin` | Tenant／Membership／Role read and manage Permissions; no Platform administration |
| `tenant_member` | `platform_user:read_self`, `external_identity:read_self` |

Changing this vocabulary is a Contract change; expanding privilege requires Architecture and Security review.

## 7. Idempotency, Audit and Security

Role Assignment and Role mutation commands require Idempotency. Same key and fingerprint returns the safe Stored Result; a changed fingerprint is rejected.

Audit is mandatory for Tenant Role creation or permission change, Role Assignment grant／revoke, last-owner denial and high-risk authorization decisions. Audit does not duplicate full Role or request payloads.

Security classification is `Confidential`. Permission denial does not reveal whether a cross-tenant resource exists.

## 8. Error, Retry and Observability

Errors: Validation, Authentication, Permission, Scope, Duplicate, Conflict, Last Owner, Invalid State, Not Found and Temporary Dependency. Retry temporary failures only with the same Idempotency Key.

Observe authorization decision counts, denial reason categories, stale-assignment detection and last-owner guard failures without logging Tokens or complete policy inputs.

## 9. Configuration and Extension

| Field | Value |
| --- | --- |
| Configuration | None; Core vocabulary is versioned contract data |
| Policies | Last-owner guard; effective-assignment evaluation |
| Strategies | None approved |
| Feature Flags | None approved |
| Extension Points | Additional approved Permission vocabulary through versioned Contract change |

## 10. Testing and Compatibility

Required tests: Core Role immutability, custom-role Tenant isolation, reserved-name rejection, cross-tenant assignment rejection, disabled Membership denial, last-owner concurrency protection, permission-set exactness and non-enumerating denial.

Breaking vocabulary or decision semantics require MAJOR version and Architecture Owner approval. Deprecation requires replacement mapping and migration guidance.

## 11. Status and History

| Review | Status |
| --- | --- |
| Module Owner | Unassigned／Pending |
| Platform Architect | Reviewed through PR #12 Decision Closure |
| Architecture Owner | Tony／Approved |
| Approval Reference | PR #12／Approved by Tony |
| Implementation | Locally Implemented |
| Verification | Locally Verified |
| Deployment | Not Deployed |
| Production Use | Not Allowed |

| Version | Date | Change | Approval |
| --- | --- | --- | --- |
| `0.1.0-draft` | 2026-07-30 | Initial Runtime Phase 1 contract | PR #12／Approved by Tony |

## 12. Open Questions

| Question | Owner | Needed By | Status |
| --- | --- | --- | --- |
| Exact Internal Administration permissions | Security／Architecture Owner | Administration design | Open |
| Permission deprecation window | Authorization Owner | Before first vocabulary change | Open |

ADR references: [ADR-015](../adr/ADR-015-TENANT-CONTEXT-INTERNAL-ADMIN.md), [ADR-017](../adr/ADR-017-PHASE-1-LIFECYCLE-AUTHORIZATION-VOCABULARY.md).
