# Webhook Deduplication

The authoritative event key combines Tenant, Application scope, provider key, trusted issuer-context digest, and provider event ID. The payload fingerprint and normalized event type detect conflicting replays. A raw body, raw UID, signature, token, or credential is never stored.

First receipt wins. A matching completed replay returns the stored safe result without repeating the business mutation. A replay while the first request is still processing returns a retryable deferred status and never claims completion. A changed payload produces `EVENT_FINGERPRINT_CONFLICT`. Receipt completion, Audit, and Core Idempotency use the existing transaction boundary.

Receipts have an explicit 24-hour TTL. When a receipt is expired, the next claim atomically marks the old row `expired` and creates one new active winner. A partial unique index prevents concurrent active winners while expired evidence remains immutable history.