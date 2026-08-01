# LINE Sandbox Live Integration

This isolated Cloudflare Worker activates one first real OA binding for sandbox proof. It resolves the public routing identifier before reading a webhook body, verifies `x-line-signature` against the exact raw bytes using that binding's credential pair, and sends one bounded text reply through the LINE Messaging API.

## Platform boundary

This deployment proves one explicitly configured OA binding; it does not claim that Platform Core supports arbitrary OA onboarding. Platform authority remains Tenant/Application/Workbench based. The LINE adapter transports a message but does not own intent, confirmation, permission, or mutation authority.

`LINE_BINDING_KEY` is a non-secret, public routing identifier. The channel secret and access token remain Cloudflare secrets. Future bindings must be resolved through a governed binding registry or secret provider so credentials and binding identity cannot be mixed across tenants or applications.

## Isolation status

- Environment: LINE provider sandbox only
- Worker: `platform-core-line-sandbox-live`
- Production Platform Core entry: unchanged
- Local Demo entry: unchanged
- D1, KV, Queue, Cron, assets, routes, migrations: none
- Secrets: referenced by name only; no values in the repository
- Deployment: not performed by this change

## Routes

- `GET /health` returns bounded JSON. It may expose the configured `LINE_BINDING_KEY` because that key is a documented public routing identifier; it never exposes credentials.
- `POST /webhook/{bindingKey}` resolves an exact, validated binding before reading the body. Missing, malformed, unknown, or mismatched binding keys return 404 without processing the payload.
- A resolved request requires both Cloudflare secrets, reads the body once, validates the signature before JSON parsing, caps the body and event count, replies only to supported text events, and ignores other events safely.

Reply-token requests are never retried. Provider 4xx, 5xx, and network failures are converted to bounded reason codes; an authenticated and accepted webhook still receives HTTP 200 so LINE does not redeliver merely because the reply call failed.

See [Setup](SETUP.md) and [Verification](VERIFY.md).
