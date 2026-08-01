# Reply Token Lifecycle

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

A reply token is transient, single-use, and excluded from persistence, evidence, logs, audit metadata, idempotency results, and Workbench input. The local contract marks it expired sixty seconds after receipt and rejects a consumed token. Redelivery additionally fails when the original event is too old.

LINE documents that reply tokens are single-use and should be used promptly; the exact provider acceptance window may change, so production code must not infer guaranteed delivery from the local policy. See the [Messaging API reply-token reference](https://developers.line.biz/en/reference/messaging-api/nojs/).
