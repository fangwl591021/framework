# Event Engine MVP

> Independent Domain Module Candidate · Contract Proposed · Locally Implemented · Locally Verified · Not Deployed · Production Use Not Allowed

Event Engine owns activity, session, form, registration, payment-status, check-in, share-reference, share-touch and notification-intent state. It is not Platform Core and does not change the ownership of Identity, Tenant, Authorization, Audit or Idempotency.

## Boundary

- Platform Core supplies UUIDv7, Tenant isolation, Permission evaluation, Audit and Idempotency.
- Event Engine owns only the ten `event*` tables introduced by `migrations/0002_event_engine.sql`.
- External identity channels resolve a Platform User before calling Event Engine. Raw provider subjects never enter Event tables.
- LINE, LIFF, Share Target Picker, payment providers, Google Calendar, notification delivery and QR rendering are Adapters.
- The MVP creates adapter-neutral Share Payloads and Notification Intents. It calls no external provider.
- Payment is status-only. Event Engine does not authorize, capture or refund money.
- QR support signs and verifies a short-lived local token. It does not render a QR image or deploy an endpoint.

## Documents

1. [Event Engine Module Contract](01-EVENT-ENGINE-CONTRACT.md)
2. [Local Verification Evidence](02-LOCAL-VERIFICATION.md)
3. [LINE No-Flood Adapter Contract](03-LINE-NO-FLOOD-ADAPTER-CONTRACT.md)
4. [Registry Entry](../registry/event-engine.md)

## Current Gate

```text
Contract Approval: Pending Architecture Owner Review
Implementation: Locally Implemented
Verification: Locally Verified on Isolated Local D1
Remote D1: Not Accessed
Production Migration: Not Executed
External Provider Calls: Not Performed
Deployment: Not Performed
Production Verification: Not Verified
```
