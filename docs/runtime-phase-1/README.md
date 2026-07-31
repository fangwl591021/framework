# Runtime Phase 1

> Decision Closure and Module Contracts are approved. The Runtime Foundation and four Phase 1 Core modules are locally implemented and locally verified. No public Domain API, remote D1, production binding, secret, deployment or production use is approved.

## Status

| Item | Status |
| --- | --- |
| Decision Closure | Approved by Tony / PR #12 |
| Module Contracts | Approved by Tony |
| Module Registry Entries | Candidate / Contract Approved |
| Runtime Foundation | Implemented / Locally Verified |
| Operational Health / Readiness | Implemented / Locally Verified |
| Identity Core | Locally Implemented / Locally Verified / Not Deployed |
| Tenant Access | Locally Implemented / Locally Verified / Not Deployed |
| Authorization | Locally Implemented / Locally Verified / Not Deployed |
| Core Operations | Locally Implemented / Locally Verified / Not Deployed |
| Phase 1 Migration | Executed and Verified on Isolated Local D1 |
| Remote Migration | Not Executed |
| Production Migration | Not Executed |
| Deployment | Not Performed |
| Production Verification | Not Verified |
| Production Use | Not Allowed |

## Reading Order

1. [Decision Closure](00-DECISION-CLOSURE.md)
2. [Identity Core Contract](01-IDENTITY-CORE-CONTRACT.md)
3. [Tenant Access Contract](02-TENANT-ACCESS-CONTRACT.md)
4. [Authorization Contract](03-AUTHORIZATION-CONTRACT.md)
5. [Core Operations Contract](04-CORE-OPERATIONS-CONTRACT.md)
6. [Runtime Operational Endpoints](05-RUNTIME-OPERATIONAL-ENDPOINTS.md)
7. [Physical Proposal Gap](06-PHYSICAL-PROPOSAL-GAP.md)
8. [Core Foundation Local Technical Decision](07-CORE-FOUNDATION-LOCAL-TECHNICAL-DECISION.md)
9. [Core Foundation Bootstrap Status](08-CORE-FOUNDATION-STATUS.md)
10. [Core Persistence and Domain Foundation Status](09-CORE-PERSISTENCE-DOMAIN-STATUS.md)
11. [Module Permission Registration Gate](MODULE-PERMISSION-REGISTRATION-GATE.md)

The four approved contracts define the logical architecture boundary. The Phase 1 executable physical reconciliation, Local D1 test authority and current implementation truth are recorded in document 09.

## Accepted ADR

- [ADR-013: UUIDv7 Core Entity IDs](../adr/ADR-013-UUIDV7-CORE-ENTITY-IDS.md)
- [ADR-014: External Identity Subject Digests](../adr/ADR-014-EXTERNAL-IDENTITY-SUBJECT-DIGEST.md)
- [ADR-015: Tenant Context and Internal Administration](../adr/ADR-015-TENANT-CONTEXT-INTERNAL-ADMIN.md)
- [ADR-016: Phase 1 Audit and Idempotency](../adr/ADR-016-PHASE-1-AUDIT-IDEMPOTENCY.md)
- [ADR-017: Phase 1 Lifecycle and Authorization Vocabulary](../adr/ADR-017-PHASE-1-LIFECYCLE-AUTHORIZATION-VOCABULARY.md)

## Explicit Boundary

Phase 1 is limited to Platform User, External Identity Mapping, Tenant, Tenant Membership, Role, Permission, Role Assignment, Idempotency, Audit and Runtime Health / Readiness.

Booking, Appointment, Calendar, Brand, Shop, Shop Membership, CRM, Point, Referral, Product, Coupon, AI Agent, LINE Messaging Adapter, public Domain APIs, Admin UI and customer-specific workflows are explicitly excluded.