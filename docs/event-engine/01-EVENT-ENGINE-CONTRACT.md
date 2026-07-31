# Event Engine Module Contract

> Domain Module Candidate · Contract Approved by Tony · Locally Implemented · Locally Verified · Not Deployed · Production Use Not Allowed

## 1. Basic Information

| Field | Value |
| --- | --- |
| Module Name | Event Engine |
| Module ID | `event-engine` |
| Purpose | Provide reusable Tenant-scoped event, registration, attendance-entry and event-statistics capabilities |
| Non-goals | Platform identity, Tenant administration, Authorization ownership, provider delivery, money movement, calendar synchronization, CRM, Booking or AI |
| Business Capability | Create and publish multi-session events, accept dynamic registrations, manage capacity/waitlists, check in attendees and report statistics |
| Lifecycle Status | Candidate |
| Owner | Unassigned |
| Version | `0.1.0-local` |
| Approval Status | Approved by Tony |

Event Engine is a Domain Module. It is not Platform Core.

## 2. Dependencies

| Field | Value |
| --- | --- |
| Required Core Contracts | Identity Core, Tenant Access, Authorization, Core Operations |
| Required Core Capabilities | UUIDv7, Platform User reference, Tenant isolation, Permission evaluation, Audit, Idempotency |
| Adapter Dependencies | Identity-channel resolution, share target, payment, calendar, notification delivery, QR presentation |
| Minimum Core Version | Runtime Phase 1 local contract baseline from PR #14 |
| Maximum Core Version | Not yet bounded |

The module calls Core public application capabilities. It does not write Core-owned Identity, Tenant, Role, Permission, Audit or Idempotency records outside the Core Operations boundary.

## 3. Public Interface

### Commands

- `CreateEvent`, `UpdateEvent`, `PublishEvent`, `CancelEvent`
- `AddEventSession`, `AddEventFormField`
- `CreateShareLink`, `RecordShareTouch`
- `RegisterForEvent`, `UpdateRegistrationAnswers`, `CancelRegistration`
- Internal operation: `ReconcileSessionCapacity`
- `UpdatePaymentStatus`
- `IssueCheckinQrToken`, `VerifyEventCheckin`

### Queries

- `GetEvent`, `ListEventSessions`, `ListEventFields`
- `GetRegistration`, `ListEventRoster`
- `GetEventStatistics`
- `GetPaymentStatus`, `GetCheckin`

### Domain Facts

The MVP persists notification intents and audit evidence but does not publish a runtime event bus. Future versioned facts may include `EventPublished`, `RegistrationConfirmed`, `RegistrationWaitlisted`, `RegistrationCancelled`, `WaitlistPromoted`, `CheckinVerified` and `EventCancelled`.

No public HTTP route or transport DTO is approved by this Contract.

## 4. Data Boundary

Owned data:

1. `events`
2. `event_sessions`
3. `event_form_fields`
4. `event_registrations`
5. `event_registration_answers`
6. `event_payments`
7. `event_checkins`
8. `event_share_links`
9. `event_share_touches`
10. `event_notifications`

All owned records contain `tenant_id`. Composite foreign keys keep Event, Session, Registration, Field, Check-in, Share and Notification references in the same Tenant.

Read-only external references are Tenant, Platform User and Tenant Membership identifiers. Event Engine never owns or copies an External Identity subject, Role, Permission, Audit payload or Idempotency payload.

Brand and Shop scope are not included in the MVP.

## 5. Lifecycle and Invariants

### Event

`draft → published → cancelled`

- Published Events cannot return to Draft.
- Cancelled Events are terminal.
- Publication requires at least one Session.
- Event cancellation cancels scheduled Sessions and active Registrations in one local D1 atomic batch.

### Registration

`confirmed | waitlisted → cancelled`

- One Platform User can have at most one active Registration per Session.
- A cancelled Registration is historical and cannot reactivate.
- Registration deletion is forbidden.
- Required dynamic fields must be supplied and values must match field types.
- Cancelling a confirmed Registration promotes the earliest available waitlisted Registration when one is observed in the same local operation.

### Capacity

- Session projection rows store `confirmed_count` and `waitlisted_count`.
- Formal D1 Triggers select the unique capacity／waitlist winner inside the write transaction.
- An application pre-read is only a routing hint; it is not the capacity authority.
- Failed capacity attempts create no Registration effect.
- Registration mutations mark a bounded reconciliation intent whenever a scheduled Session has both available capacity and a waitlist.
- `reconcileSessionCapacity(tenantId, sessionId)` conditionally promotes only the earliest still-waitlisted Registration, is safe to retry, and cannot exceed capacity.
- A guarded clear rejects an incomplete reconciliation, so a racing loser leaves a retryable intent instead of silently losing the vacancy.

### Check-in

- Only a confirmed Registration in a published Event and scheduled Session is eligible.
- One active verified Check-in is allowed per Registration.
- Check-in deletion is forbidden.
- QR tokens are HMAC-signed, versioned, short-lived and stored only as SHA-256 digests after use.

## 6. Permission and Security

The MVP reuses the existing Core Permission vocabulary and does not modify Authorization ownership:

| Event Action | Existing Core Permission |
| --- | --- |
| Create／edit／publish／cancel Event, Session, Field, Share, Payment status | `tenant:update` |
| View roster and answers | `membership:read` |
| Issue QR token and verify manual／QR Check-in | `membership:manage` |
| View statistics | `tenant:read` |

This mapping is a local MVP policy, not a permanent expansion of the Core vocabulary. Event-specific Permission keys require a later Authorization Contract decision.

Registration participants are Platform Users resolved by an Adapter and do not need Tenant Membership. Administrative operations always require an active Tenant Membership with the mapped Core Permission.

Dynamic answers may contain Tenant-defined confidential personal data. The module stores only submitted answers, stable Core references and adapter-neutral identifiers. It does not store raw external identity subjects, Authorization headers, provider tokens, QR tokens or payment credentials.

## 7. Audit and Idempotency

All state-changing commands use the existing Core Operations implementation:

- Tenant-scoped Idempotency key and request fingerprint.
- Same key and fingerprint replays the bounded Stored Result.
- Same key with another fingerprint is rejected.
- Claim, Domain mutation, minimal Audit and Stored Result completion share one local D1 atomic batch.
- Audit stores action, resource reference, result reason and correlation only; it does not copy answers, share payloads, QR tokens or provider payloads.

Audit action families are `event.*`, `event.session.*`, `event.field.*`, `event.registration.*`, `event.payment.*`, `event.share.*` and `event.checkin.*`.

## 8. Adapter Contracts

| Adapter | Domain Input／Output | Explicitly Excluded |
| --- | --- | --- |
| Identity Channel | Resolve external identity to Platform User before registration | Raw LINE／Google／Apple subject persistence |
| Share Target | Consume versioned `EventSharePayload` | LINE Share Target Picker API call |
| Notification | Consume `event_notifications` intent | LINE／email／push delivery |
| Payment | Report a validated status transition | Authorization, capture, refund or credentials |
| Calendar | Future consume published Event／Session facts | Google Calendar API call |
| QR | Present token and return it for verification | QR image generation inside Domain Core |

## 9. Reliability and Operations

Public errors are validation, permission, Tenant boundary, invalid state, duplicate registration, capacity full, waitlist full, Idempotency conflict, duplicate check-in, invalid QR, expired QR and reconciliation retry required.

Only transient Adapter failures may be retried, always with the original Idempotency key. Domain conflicts are not automatically retried with a new key.

Queries are bounded to 100 records. Roster, capacity, check-in, notification and share-touch access paths have Tenant-first indexes and query-plan evidence.

Known limitations:

- No public API or UI.
- No automatic external notification dispatch.
- No actual payment transaction.
- No Google Calendar synchronization.
- No QR image rendering.
- No Remote D1 or Production evidence.
- No Queue, Cron, Remote Worker or Production Scheduler invokes reconciliation. Local callers may safely retry the bounded internal operation after related Registration mutations.

## 10. Testing Requirements and Evidence

| Test | Status |
| --- | --- |
| Fresh Local D1 migration and object inspection | Locally Verified |
| Complete event-to-statistics flow | Locally Verified |
| Multi-session and dynamic fields | Locally Verified |
| Tenant isolation and Event permission | Locally Verified |
| Idempotency replay／fingerprint conflict | Locally Verified |
| Capacity／waitlist concurrent winners | Locally Verified |
| Cancellation reconciliation retry／replay／no duplicate promotion | Locally Verified |
| Duplicate registration | Locally Verified |
| Manual／QR check-in and replay protection | Locally Verified |
| Audit minimization and raw-token absence | Locally Verified |
| Remote／Production verification | Not Verified |

Evidence is summarized in [Local Verification](02-LOCAL-VERIFICATION.md).

## 11. Compatibility and Lifecycle

Breaking command, state, permission or adapter payload changes require a MAJOR Contract version and Architecture Owner review. Deprecation requires a documented replacement and migration window.

Stable use cases: None. Local tests do not promote this Candidate to Experimental or Stable.

Related decisions: ADR-003, ADR-013, ADR-015, ADR-016 and ADR-017. No new ADR is accepted by this PR.

## 12. Approval and History

| Review | Status |
| --- | --- |
| Module Owner | Unassigned／Pending |
| Platform Architect | Approved |
| Architecture Owner | Tony／Approved |
| Security Review | Approved |
| Approval Date | 2026-07-31 |
| Approval Reference | PR #15／Tony approval |
| Implementation | Locally Implemented |
| Verification | Locally Verified |
| Deployment | Not Deployed |
| Production Use | Not Allowed |

| Contract Version | Date | Author | Change | Approval |
| --- | --- | --- | --- | --- |
| `0.1.0-local` | 2026-07-31 | Codex | Event Engine MVP contract, Local D1 evidence and bounded waitlist reconciliation | Approved by Tony |

## 13. Open Questions

| Question | Decision Owner | Needed By | Status |
| --- | --- | --- | --- |
| Event-specific Permission vocabulary and Core registration mechanism | Architecture／Authorization Owner | Before Experimental | Open |
| Registration answer retention and data-subject handling | Privacy／Security Owner | Before external pilot | Open |
| Payment provider status mapping and money-movement ownership | Security／Finance Owner | Before Payment Adapter | Open |
| Transport routes, DTOs and authentication | Security／Architecture Owner | Before public API | Open |
| Notification delivery and Calendar event contracts | Relevant Module Owners | Before Adapter implementation | Open |
