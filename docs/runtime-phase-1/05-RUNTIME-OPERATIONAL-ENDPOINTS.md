# Runtime Phase 1 Operational Endpoints

> Contract approved. The Foundation implements `/health` and `/ready`; this document does not authorize Domain Module, D1 or production readiness.

## Health Check Classification

Health Check is a Runtime Operational Endpoint, not a Domain Module and not a Module Registry entry.

| Endpoint concept | Responsibility | Dependency |
| --- | --- | --- |
| Liveness | Report that the Worker process can accept a request | None |
| Readiness | Report whether required configured dependencies are usable | Explicit dependency checks only |

## Rules

- Liveness must not mutate data or require Tenant Context.
- Readiness must not create tables, execute migrations, disclose binding identifiers or expose Secrets.
- Responses expose only a coarse status and correlation reference; internal exception text stays in protected logs.
- Health endpoints do not prove Identity, Tenant, Authorization, D1 or production readiness.
- No Booking, Appointment, Calendar or other business capability belongs in a Health Check.

## Status

```text
Contract: Approved
Architecture Approval: Approved by Tony／PR #12
Implementation: Implemented
Verification: Locally Verified
Deployment: Not Deployed
D1／Provider／Production Readiness: Not Verified
```
