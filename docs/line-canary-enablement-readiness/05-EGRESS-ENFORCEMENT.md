# Egress Enforcement

Status: Lifecycle **Canary Enablement Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Execution **Not Authorized**; Canary Execution **Not Authorized**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy／Decision Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The deterministic adapter validates a server-owned policy version plus exact HTTPS scheme, non-routable fixture hostname, port 443, and POST method. Wildcards, arbitrary URLs, unknown keys, scheme/port/method mismatches, and redirect targets outside the exact allowlist fail closed.

The result is decision-only and always has `networkExecuted=false`. It creates neither a network client nor a firewall, DNS, endpoint, Binding, or provider authorization.
