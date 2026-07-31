# Circuit Breaker

States are `closed`, `open`, and `half_open`. Failure threshold and state transition are one local atomic update. Cooldown permits exactly one half-open probe with a fenced lease token. Only that current probe may close or reopen the circuit; a stale probe is rejected. Version increases monotonically, and threshold races emit one opening transition.

Scope can be provider, Tenant/provider, Module, or platform. A Tenant/provider outage must not become a global outage. State identity, version, and lifecycle transitions are guarded by D1 constraints and triggers. Circuit evidence is emitted through Platform Observability without changing the protected business result.