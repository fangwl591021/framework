# Webhook Normalization

Status: Lifecycle **Isolated Verification Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Normalization runs only after successful signature verification and accepts at most 16 KiB and 50 events. Text, file, location, follow, unfollow, and postback events map to bounded provider and channel-neutral metadata. Unknown event types, missing event IDs, malformed timestamps, oversized identifiers, and unbounded content fail closed.

`destination` is presence-only evidence and never Tenant authority. A source user/group/room reference is transient lookup-only data and never permission authority. Message text, postback data, reply token, raw UID, signature, and raw payload are absent from safe evidence.
