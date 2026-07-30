# Core Operations Module Contract

> Contract Approved · Approved by Tony · Not Implemented · Not Verified · Not Deployed

## 1. Basic Information

| Field | Value |
| --- | --- |
| Module Name | Core Operations |
| Module ID | `core-operations` |
| Purpose | Provide cross-cutting Idempotency, Audit, Correlation and Internal Administration boundaries |
| Non-goals | Domain transaction ownership, debug logging, authentication and deployment |
| Business Capability | Produce one safe result per protected intent and preserve minimal decision evidence |
| Lifecycle Status | Candidate |
| Owner | Unassigned |
| Version | `0.1.0-draft` |
| Approval Status | Approved |

## 2. Dependencies

| Field | Value |
| --- | --- |
| Dependencies | None at the Module Contract level |
| Adapter Dependencies | Future clock, persistence and secure administration credential ports; none implemented |
| Minimum／Maximum Core Version | N/A／N/A |

## 3. Public Interface

| Type | Contract |
| --- | --- |
| Interfaces | `IdempotencyService v1`, `AuditService v1`, `CorrelationContext v1`, `InternalAdministrationBoundary v1` |
| Commands | `ClaimIntent`, `CompleteIntent`, `FailIntent`, `RecoverStaleIntent`, `RecordAudit`, future controlled `BootstrapPlatformAdministrator` |
| Queries | `GetStoredResult`, `GetIntentStatus`, restricted `SearchAudit` |
| Events Published | None required in Phase 1 |
| Events Consumed | None |

The bootstrap command is a future contract boundary only. It is not a public endpoint and is not authorized for implementation by this PR.

## 4. Domain and Data Boundary

| Field | Value |
| --- | --- |
| Owned Data | Idempotency Record; Audit Record |
| Aggregate Roots | Idempotency Record; Audit Record |
| Identity Reference Type | Platform User, Service Principal, System |
| Business Reference | Domain-owned resource reference; Core Operations never replaces it |
| Read-only External Data | Safe Actor and resource references supplied by the calling Module |
| Tenant Boundary | Nullable Tenant for explicit Platform operations; required for Tenant operations |
| Shop Boundary | Not applicable in Phase 1 |
| Logical Storage Scope | `idempotency_records`, `audit_records` |
| Migration Requirements | Separate approved Migration Package required |

## 5. Idempotency Contract

Logical content:

- `operation_scope`
- nullable `tenant_id`
- nullable `actor_id`
- `idempotency_key`
- `request_fingerprint`
- processing status
- safe Stored Result
- resource reference
- expiration／retention reference
- processing owner, generation／fencing reference and correlation

Required behavior:

- Same key, scope and fingerprint returns the Stored Result.
- Same key and scope with another fingerprint is rejected without a second effect.
- Full request payloads are not stored.
- `in_progress` has timeout, takeover and stale-owner fencing semantics.
- Stored Results contain a safe response summary and resource reference, not Secrets or complete Domain records.
- Identity Linking, Membership Mutation, Role Assignment Mutation and Tenant Mutation use this contract.

## 6. Audit Contract

Actor types are `platform_user`, `service_principal` and `system`.

Minimum logical content: actor type and reference, action, resource type and ID, nullable Tenant, result, reason code, correlation ID and creation time.

Audit excludes Secret, Token, Authorization Header, raw Provider Subject, complete Request／Response Payload and unnecessary PII snapshots. Audit is evidence, not a Domain Transaction or Idempotency Stored Result.

## 7. Internal Administration Boundary

- No public bootstrap API exists.
- First registration never grants administration.
- Platform operations cannot be disguised as Tenant operations.
- A future one-time Administration Command requires explicit authorization, Idempotency, Audit, correlation and execution approval.
- Tenant and Platform User write interfaces remain internal-only before Security and Execution Gates.

## 8. Error, Retry and Observability

Errors: Validation, Permission, Scope, Duplicate, Fingerprint Conflict, Processing, Stale Owner, Expired, Invalid State and Temporary Dependency.

Retry uses the same Idempotency Key. Metrics cover claim conflict, stale processing, takeover, Stored Result retrieval and Audit write failure without copying protected payloads.

## 9. Configuration and Extension

| Field | Value |
| --- | --- |
| Configuration | Operation-specific timeout and retention class; values remain open |
| Policies | Stored Result filtering; Audit minimization; stale-processing recovery |
| Strategies | Fingerprint canonicalization and fencing implementation remain design concerns |
| Feature Flags | None approved |
| Extension Points | Restricted log／archive adapters after Security review |

## 10. Testing and Compatibility

Required tests: same-key replay, changed-fingerprint rejection, processing timeout, takeover fencing, stale-owner completion rejection, safe Stored Result filtering, Audit forbidden-field scanning, Platform／Tenant scope separation and correlation continuity.

Breaking semantics require MAJOR version and Architecture Owner approval. Deprecation requires a replacement and retention-aware migration path.

## 11. Status and History

| Review | Status |
| --- | --- |
| Module Owner | Unassigned／Pending |
| Platform Architect | Reviewed through PR #12 Decision Closure |
| Architecture Owner | Tony／Approved |
| Approval Reference | PR #12／Approved by Tony |
| Implementation | Not Implemented |
| Verification | Not Verified |
| Deployment | Not Deployed |
| Production Use | Not Allowed |

| Version | Date | Change | Approval |
| --- | --- | --- | --- |
| `0.1.0-draft` | 2026-07-30 | Initial Runtime Phase 1 contract | PR #12／Approved by Tony |

## 12. Open Questions

| Question | Owner | Needed By | Status |
| --- | --- | --- | --- |
| Audit and Idempotency retention periods | Security／Privacy Owner | Migration approval | Open |
| Stored Result size limit and canonical fingerprint | Platform Architect | Runtime implementation | Open |
| Service Principal credential mechanism | Security Owner | Administration design | Open |

ADR reference: [ADR-016](../adr/ADR-016-PHASE-1-AUDIT-IDEMPOTENCY.md).
