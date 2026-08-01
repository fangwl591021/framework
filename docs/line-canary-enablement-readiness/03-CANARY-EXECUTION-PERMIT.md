# Canary Execution Permit

Status: Lifecycle **Canary Enablement Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Execution **Not Authorized**; Canary Execution **Not Authorized**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy／Decision Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

A permit binds an opaque provider-account reference, environment, approval snapshot, credential reference/version, egress policy version, budget policy version, cohort policy version, status, and bounded issue/expiry buckets. Its maximum lifetime is server-owned and bounded.

Paused, revoked, expired, overlong, unknown, or binding-mismatched permits fail closed. The contract hard-codes `executable=false` and `productionAuthority=false`; even a valid candidate permit returns only `canary_readiness_candidate` and is not a delivery authorization.
