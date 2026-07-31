# Known Limitations

- Local Map-based adapters and isolated Local D1 are deterministic single-process evidence, not distributed Production coordination across Workers or regions.
- Production requires a separately approved coordination adapter and architecture decision. Candidate options include Durable Objects, Cloudflare Rate Limiting, or Queue-backed processing; none is selected, configured, or implemented here. Provider adapters must implement the existing admission contracts and may not leak provider concerns into Domain policy.
- No Cloudflare Rate Limiting API, Durable Object, Queue, Cron, scheduler, external provider, Remote D1, production Binding, or deployment exists.
- Production policy values, capacity thresholds, retention executor, alert routing, and storage topology remain unapproved.
- The Contract is Approved by Tony and Architecture/Security review is Approved for this local Candidate only.
- Platform-wide provider circuits are modeled but not connected to provider telemetry.
- Backpressure records local retry intent only; no background executor is implemented.
- Expired webhook receipts remain immutable history until a separately governed bounded retention executor is approved; this Sprint creates no executor or scheduler.
