# Automatic Pause

Status: Lifecycle **Canary Enablement Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Execution **Not Authorized**; Canary Execution **Not Authorized**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy／Decision Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The deterministic policy pauses on signature-failure spike, replay-conflict spike, simulated provider 429 or 5xx spike, cost threshold, latency threshold, evidence failure, credential revocation, approval revocation, or kill-switch activation. Thresholds are bounded and server-owned.

Pause decisions always deny dispatch and carry no Canary or Provider authority. The signals are local fixtures rather than claims about real provider traffic or production telemetry.
