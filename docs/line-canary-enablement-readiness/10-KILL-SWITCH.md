# Kill Switch

Status: Lifecycle **Canary Enablement Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Execution **Not Authorized**; Canary Execution **Not Authorized**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy／Decision Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Kill switch has priority over permit, cohort, budget, retry, and any simulated provider result. Both active and inactive readiness states deny dispatch because Canary execution is not authorized. When active, the decision explicitly reports the kill-switch reason.

Failure to write side-channel evidence must not block the stopping decision. Core Audit remains a separate mutation obligation and is not replaced or weakened by Canary evidence.
