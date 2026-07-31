# Known Limitations

- Local Map-based adapters are deterministic test adapters, not distributed production coordination.
- No Cloudflare Rate Limiting API, Durable Object, Queue, Cron, scheduler, external provider, Remote D1, production Binding, or deployment exists.
- Production policy values, capacity thresholds, retention executor, alert routing, and storage topology remain unapproved.
- The Contract remains Proposed until Tony and required Architecture/Security reviewers approve it.
- Platform-wide provider circuits are modeled but not connected to provider telemetry.
- Backpressure records local retry intent only; no background executor is implemented.
- Expired webhook receipts remain immutable history until a separately governed bounded retention executor is approved; this Sprint creates no executor or scheduler.
