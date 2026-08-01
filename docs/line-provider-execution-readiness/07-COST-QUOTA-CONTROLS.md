# Cost and Quota Controls

Status: Lifecycle **Execution Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Provider Execution **Not Authorized**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Server-owned policies define hard per-request, daily, monthly, requests-per-minute, message-count, and retry ceilings. Any client budget, quota, retry, or cost override is rejected. Decisions are deterministic and fail closed at the first exceeded limit; a Tenant may be stricter but cannot loosen platform ceilings.

These values are governance fixtures, not provider billing, pricing, or quota claims. No charge, purchase, Provider API call, or financial authority exists in this phase.
