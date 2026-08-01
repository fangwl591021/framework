# Outage and Redelivery Drills

Status: Lifecycle **Canary Enablement Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Execution **Not Authorized**; Canary Execution **Not Authorized**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy／Decision Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The outage drill passes only when simulated provider availability is false, the kill switch is operational, and fallback is Fake Only. It records no provider delivery and performs no fallback send.

The redelivery drill compares bounded fingerprints under a stable provider-event identity. An exact duplicate is replay-safe and never allows duplicate mutation; a changed fingerprint is a conflict and fails the drill. Both are deterministic local simulations without webhook or transport.
