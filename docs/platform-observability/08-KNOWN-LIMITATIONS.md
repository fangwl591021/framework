# Known Limitations

- Contract remains Proposed pending Architecture/Security review.
- No real Telegram adapter, provider API call, credential, Chat ID value, Remote D1, Binding, or deployment exists.
- Runtime composition has no D1 Binding; its failure Observation port is disabled until a trusted Application composition injects the D1 implementation.
- Alert retry is a bounded local intent; there is no Queue, Cron, scheduler, or Production worker.
- Retention expiry is modeled and indexed but no deletion/archive executor is authorized.
- There is no public Admin UI or public diagnostics API.
- AI root-cause analysis is an interface with a disabled adapter.
- Metrics export, distributed trace transport, traffic rate limiting, circuit breaker, webhook queue, and webhook deduplication are outside this Sprint. Traffic protection remains PR #20 scope.
- Load, soak, collision-volume, and Production provider verification remain open.