# Runtime Phase 1 Decision Closure

> Architecture and documentation only. No Runtime, SQL, Migration, D1 access, Binding, Secret or Deployment is authorized by these documents.

## Status

| Item | Status |
| --- | --- |
| Decision Closure | Proposed — awaiting Tony approval |
| Module Contracts | Contract Defined — Pending Approval |
| Module Registry Entries | Proposed |
| Runtime | Not Implemented |
| Verification | Not Verified |
| Deployment | Not Deployed |

## Reading Order

1. [Decision Closure](00-DECISION-CLOSURE.md)
2. [Identity Core Contract](01-IDENTITY-CORE-CONTRACT.md)
3. [Tenant Access Contract](02-TENANT-ACCESS-CONTRACT.md)
4. [Authorization Contract](03-AUTHORIZATION-CONTRACT.md)
5. [Core Operations Contract](04-CORE-OPERATIONS-CONTRACT.md)
6. [Runtime Operational Endpoints](05-RUNTIME-OPERATIONAL-ENDPOINTS.md)
7. [Physical Proposal Gap](06-PHYSICAL-PROPOSAL-GAP.md)

The four contracts define the Phase 1 logical and public architecture boundary. They do not define HTTP endpoints, tables, columns or executable handlers.

## Proposed ADR

- [ADR-013: UUIDv7 Core Entity IDs](../adr/ADR-013-UUIDV7-CORE-ENTITY-IDS.md)
- [ADR-014: External Identity Subject Digests](../adr/ADR-014-EXTERNAL-IDENTITY-SUBJECT-DIGEST.md)
- [ADR-015: Tenant Context and Internal Administration](../adr/ADR-015-TENANT-CONTEXT-INTERNAL-ADMIN.md)
- [ADR-016: Phase 1 Audit and Idempotency](../adr/ADR-016-PHASE-1-AUDIT-IDEMPOTENCY.md)
- [ADR-017: Phase 1 Lifecycle and Authorization Vocabulary](../adr/ADR-017-PHASE-1-LIFECYCLE-AUTHORIZATION-VOCABULARY.md)

## Explicit Boundary

Phase 1 is limited to Platform User, External Identity Mapping, Tenant, Tenant Membership, Role, Permission, Role Assignment, Idempotency, Audit and a Runtime Health Check contract.

Booking, Appointment, Calendar, Brand, Shop, Shop Membership, CRM, Point, Referral, Product, Coupon, AI Agent, LINE Messaging Adapter and customer-specific workflows are explicitly excluded.
