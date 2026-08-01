# Canary Policy

Status: Lifecycle **Execution Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Provider Execution **Not Authorized**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The modeled stages are `disabled`, `internal`, `limited`, `paused`, and `approved_for_canary`. There is no production-active state. Promotions require valid approvals, fresh evidence, an operational kill switch, a rehearsed rollback, and budget eligibility. Stage skips fail closed; regression deterministically moves the state to `paused`.

`approved_for_canary` is only a readiness label. It cannot dispatch traffic, create a webhook, provision credentials, or grant authority. Real Shadow, Canary, and Production traffic require separate implementation and approval work.
