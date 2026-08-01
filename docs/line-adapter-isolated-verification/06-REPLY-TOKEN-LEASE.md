# Reply-token Lease

Status: Lifecycle **Isolated Verification Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The local lease stores only a SHA-256 digest, receipt time, event time, and consumed state in memory. It never persists or exposes the raw reply token. A token is available only before the one-minute receipt boundary, becomes used after one consumption, and cannot be consumed again.

A redelivered token without tracked local usability is `redelivery_unverified`, not automatically usable. A tracked token remains subject to its consumed state and the published event-age exception. Missing, expired, used, or unverified tokens degrade to no reply; unsafe mutation retry never reuses the token blindly.
