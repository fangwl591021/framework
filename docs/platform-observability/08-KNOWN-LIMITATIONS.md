# Known Limitations

- Contract is Approved by Tony; Architecture and Security reviews are Approved.
- No real Telegram adapter, provider API call, credential, Chat ID value, Remote D1, Binding, or deployment exists.
- Runtime composition has no D1 Binding; its failure Observation port is disabled until a trusted Application composition injects the D1 implementation.
- Alert retry is a bounded local intent; there is no Queue, Cron, scheduler, or Production worker.
- Retention eligibility and the internal bounded anonymization service are locally verified, but no scheduler, Queue, Cron, public route, or Production Retention Executor is authorized.
- Incident archival is modeled as a future governed lifecycle action; no archive mutation is exposed in this Sprint.
- There is no public Admin UI or public diagnostics API.
- AI root-cause analysis is an interface with a disabled adapter.
- Metrics export, distributed trace transport, traffic rate limiting, circuit breaker, webhook queue, and webhook deduplication are outside this Sprint. Traffic protection remains PR #20 scope.
- Load, soak, collision-volume, and Production provider verification remain open.