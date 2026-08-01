# Fake Transport

Status: Lifecycle **Isolated Verification Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

`LineProviderTransportPort` establishes a narrow provider boundary. `FakeLineTransport` supports only fixed success, transient failure, permanent failure, and rate-limited scenarios. It accepts bounded reply metadata in memory and records only operation, event key, message count, text-unit count, and `networkUsed=false`.

Kill switch precedes simulation. Disabled state fails closed. Retry-after is an allowlisted category, never an arbitrary delay; reply outcomes always have `retrySafe=false`. There is no HTTP client, endpoint, SDK, access token, provider receipt, or network retry.
