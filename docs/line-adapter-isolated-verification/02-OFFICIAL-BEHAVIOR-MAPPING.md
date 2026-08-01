# Official Behavior Mapping

Status: Lifecycle **Isolated Verification Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

| Published behavior | Isolated verification evidence |
| --- | --- |
| HMAC-SHA256 over the unchanged request body and `x-line-signature` | Exact-byte Web Crypto verification before parsing; published empty-events vector plus UTF-8, whitespace, line-ending, escape, malformed Base64, and wrong-key negatives |
| `webhookEventId` identifies an event | Account-scoped replay guard; exact duplicate replays and a changed payload conflicts |
| `deliveryContext.isRedelivery` describes redelivery | Evidence-only flag; excluded from the payload fingerprint and never used as authority |
| Delivery order may differ from event order | Timestamp is retained for context but never replaces the replay key |
| Reply token is transient and single-use | Digest-only in-memory lease with an exclusive consumed state and no persisted token |
| Empty `events` may be sent to verify communication | Harness returns a deterministic safe HTTP 200 decision without creating a route |

Sources: [signature verification](https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/), [webhook reception and redelivery](https://developers.line.biz/en/docs/messaging-api/receiving-messages/), [Messaging API reference](https://developers.line.biz/en/reference/messaging-api/nojs/), and [webhook URL verification](https://developers.line.biz/en/docs/messaging-api/verify-webhook-url/).
