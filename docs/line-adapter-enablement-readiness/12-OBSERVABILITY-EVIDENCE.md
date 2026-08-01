# Observability Evidence

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Safe evidence is allowlisted and bounded: adapter key, readiness lifecycle, simulated/rejected/no-go status, reason code, normalized event type, short replay-key digest prefix, latency bucket, support code, and `networkUsed=false`.

Payload, UID, message, token, signature, credential reference/value, authorization data, provider response, endpoint, SQL, and stack are excluded. Observability remains a sidecar and cannot alter signature, replay, identity, Workbench, audit, or mutation results.
