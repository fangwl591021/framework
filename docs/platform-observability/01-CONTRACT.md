# Platform Observability Contract

## Status

- Lifecycle: Platform Service Candidate
- Contract: Proposed
- Implementation: Locally Implemented
- Verification: Locally Verified
- Deployment: Not Deployed
- Production Use: Not Allowed

## Owns

- bounded Observation Events and retention boundary;
- deterministic failure classification;
- Incident aggregation and lifecycle evidence;
- User, Tenant Admin, and Platform Operator diagnostic projections;
- expiring Support Code mapping;
- required and optional dependency health aggregation;
- alert policy evaluation, delivery evidence, cooldown, and retry intent.

## Does Not Own

Business decisions, provider credentials, public administration UI, traffic limiting, circuit breaking, webhook queues or deduplication, AI root-cause execution, provider transport, and deployment authority.

## Dependencies

Runtime correlation context, UUIDv7, Tenant isolation, Authorization, Audit, Idempotency, D1, and Platform Reliability release-health evidence.

## Permissions

`diagnostics:read_tenant`, `diagnostics:read_platform`, `incident:read`, `incident:manage`, `alert:read`, and `alert:manage` are installed only by reviewed Migration 0004 through the Module Permission Registration Gate. No role receives them automatically.