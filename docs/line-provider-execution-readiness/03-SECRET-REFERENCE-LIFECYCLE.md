# Secret Reference Lifecycle

Status: Lifecycle **Execution Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Provider Execution **Not Authorized**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Only provider-neutral metadata is modeled: an opaque reference name, environment, purpose, version, lifecycle state, issue/expiry time, and safe digest prefix. A value, token, channel secret, access token, authorization header, provider payload, or environment Binding is rejected.

Lifecycle is `planned`, `provisioned`, `active`, `rotating`, `revoked`, or `expired`. The current phase remains `planned`. Environment mismatches, expired or revoked references, unknown state, version skips, and reuse of the same reference during rotation fail closed. Rollback selects an independently valid prior reference and never revives a revoked credential. No secret provider is selected or accessed here.
