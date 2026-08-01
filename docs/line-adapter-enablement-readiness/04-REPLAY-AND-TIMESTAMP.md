# Replay and Timestamp

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Replay identity is stable and account-scoped: `(channel account key, webhook event ID)`. Redelivery never creates a second Workbench or Domain effect; a different payload digest for the same key is a conflict. This aligns with LINE guidance to use `webhookEventId` for duplicate detection in [webhook reception](https://developers.line.biz/en/docs/messaging-api/receiving-messages/).

The local readiness policy rejects events older than five minutes or more than thirty seconds in the future. These are Framework risk limits, not a claim that the provider signature contains a timestamp. Provider event ordering is never authority for business mutation ordering.
