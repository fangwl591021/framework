# Kill Switch

Scopes are Platform, environment, Provider, model, Tenant, Application, task, and Provider plus task. Platform precedence is highest. `disabled` rejects new work; `drain_only` rejects new interactive work while explicitly allowed in-flight work may finish.

Checks occur before Provider invocation. Storage failure fails closed. Versioned mutations are audited and idempotent. Kill switches complement rather than replace circuit breakers.
