# Circuit Breaker

States are `closed`, `open`, and `half_open`. Failure threshold opens the scoped circuit, cooldown controls the first probe, and a bounded probe limit prevents a half-open stampede. Success closes the circuit; a failed probe reopens it.

Scope can be provider, Tenant/provider, Module, or platform. A Tenant/provider outage must not become a global outage. State identity, version, and lifecycle transitions are guarded by D1 constraints and triggers. Circuit evidence is emitted through Platform Observability without changing the protected business result.