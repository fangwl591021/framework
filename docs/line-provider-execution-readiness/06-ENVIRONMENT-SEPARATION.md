# Environment Separation

Status: Lifecycle **Execution Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Provider Execution **Not Authorized**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Local, isolated, staging, and production scopes must have distinct provider-account, credential-reference, approval, policy, quota, evidence, and incident namespaces. A record from one environment cannot satisfy a gate in another. Client input cannot select an environment or promote evidence.

Local fixtures are intentionally non-routable and have no secret value. No production environment configuration, Binding, route, or database is created by this package.
