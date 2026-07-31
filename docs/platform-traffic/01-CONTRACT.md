# Platform Traffic Protection Contract

## Status

Platform Service Candidate; Contract Approved by Tony; Architecture Review Approved; Security Review Approved; Locally Implemented and Locally Verified; Not Deployed; Production Use Not Allowed.

## Owns

- Trusted admission sequencing before expensive business or database work.
- Provider-neutral webhook duplicate detection, rate decisions, Tenant budgets, circuit state, degradation state, backpressure receipts, and bounded safe evidence.
- Safe retry and rejection categories without leaking implementation detail.

## Does not own

Identity, Tenant authority, Module enablement, Permission policy, Core Audit, business rules, billing, provider credentials, provider transport, production scheduling, or deployment.

## Dependencies

Trusted Runtime context, signature verifier evidence, Module Gate, Authorization, Core Audit and Idempotency, Platform Observability, UUIDv7, and D1.

Circuit open/half-open/closed and degradation activation/recovery emit bounded PR #19 Observation events for existing Incident and alert-policy aggregation. Observability is a sidecar. Its failure cannot turn an admitted or completed business operation into a failure, and it never replaces Core Audit.
## Approval boundary

Approval covers the local Contract, migration, and deterministic verification evidence in PR #20. It does not approve a Production coordination adapter, Remote D1, provider API, Binding, Secret, deployment, or Production use.
