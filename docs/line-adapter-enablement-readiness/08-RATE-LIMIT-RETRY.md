# Rate Limit and Retry

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Rate decisions are deterministic and server-owned. Kill switch, provider availability, remaining capacity, and in-flight count produce only a simulated eligibility decision. Provider numeric limits are not hard-coded because they are endpoint- and channel-scoped and may change.

Reply-token operations and committed mutations are never retried blindly. Unknown results enter manual reconciliation. A future supported outbound operation may be retried once only when a stable provider retry key exists and the original request is identical. LINE documents retry-key behavior separately in [Retry failed API requests](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/); this package performs no retry.
