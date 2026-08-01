# Egress Policy

Status: Lifecycle **Execution Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Provider Execution **Not Authorized**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The local evaluator accepts only server-owned exact targets. It rejects wildcard hosts, client URLs, non-HTTPS schemes, ports other than 443, methods other than POST, unlisted redirects, and environment mismatches. DNS and resolved IP data are diagnostic inputs only and cannot confer authority.

The deterministic target uses a reserved invalid fixture hostname and performs no resolution or network call. A future execution PR must separately pin official provider destinations, define redirect behavior, protect against SSRF and DNS rebinding, prove outbound telemetry redaction, and obtain Execution Approval. This document is policy, not an egress allow or firewall rule.
