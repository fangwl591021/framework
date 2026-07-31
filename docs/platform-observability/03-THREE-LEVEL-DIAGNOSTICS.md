# Three-level Diagnostic Policy

## End User

Receives an explicit `accepted`, `processing`, `succeeded`, `failed`, or `action_required` status, a safe action, retry guidance, and a Support Code when relevant. The error envelope preserves its existing `code` and `message`, adding only optional `supportCode`, `retryable`, `actionRequired`, and `statusCategory` fields.

## Tenant Admin

May read only its Tenant evidence and sees Tenant/Application, module, time, severity, safe category, digested actor reference, suggested action, and Support Code. A Tenant cannot query another Tenant Support Code or platform/provider-wide evidence.

## Platform Operator

With `diagnostics:read_platform`, may read cross-Tenant diagnostic evidence including correlation, trace, environment, release, operation, dependency health, safe category, bounded technical evidence, retry and occurrence counts, and alert state. Sensitive values remain redacted or digested.

Frontend hiding is never an authorization boundary; every query and lifecycle mutation checks permission and Tenant scope in the service.