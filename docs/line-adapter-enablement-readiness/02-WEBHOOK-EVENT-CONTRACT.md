# Webhook Event Contract

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The contract accepts a fixed event vocabulary and bounded metadata only: normalized event type, webhook event ID, event timestamp, source type, redelivery flag, bounded text length, and reply-token presence. Unknown keys and event types fail closed.

Raw body, destination, user/group/room identifiers, message content, postback data, reply token, and provider payload are transient inputs to a future verifier/normalizer and are excluded from the persistence contract. Empty event arrays used for provider communication checks remain a future handler concern and are not routes in this package.
