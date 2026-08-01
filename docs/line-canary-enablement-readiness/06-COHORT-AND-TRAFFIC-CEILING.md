# Cohort and Traffic Ceiling

Status: Lifecycle **Canary Enablement Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Execution **Not Authorized**; Canary Execution **Not Authorized**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy／Decision Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The server-owned policy allowlists `internal_operators` and `designated_testers`, binds Tenant and Application scope references, caps traffic in basis points, and caps message count. A stable bounded digest prefix produces the same cohort bucket for the same scope and policy.

Unknown cohorts, scope mismatch, message overflow, traffic above the hard ceiling, or any client override fail closed. Cohort selection is readiness evidence only; it cannot authorize traffic, identity, permission, confirmation, or mutation.
