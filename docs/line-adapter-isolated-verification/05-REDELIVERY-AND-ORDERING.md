# Redelivery and Ordering

Status: Lifecycle **Isolated Verification Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The replay identity is `(channel account key, webhookEventId)`. The first payload fingerprint is accepted, an exact duplicate is replayed, and the same identity with changed business payload is a conflict. `deliveryContext.isRedelivery` is excluded from the fingerprint so the official redelivery flag change does not create a false conflict.

Timestamp is context only. Earlier events may arrive after later events without bypassing replay checks. No delivery-count or redelivery-interval constant is encoded because LINE does not guarantee fixed values or reliable delivery.
