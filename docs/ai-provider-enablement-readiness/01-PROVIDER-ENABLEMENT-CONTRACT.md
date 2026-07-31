# Provider Enablement Contract

Provider governance is Platform-owned. Clients, Tenants, administrators, and Provider Adapters cannot select a Provider, change lifecycle, weaken data policy, raise a hard ceiling, or override a kill switch.

Every lifecycle or kill-switch mutation requires Platform context, an exact Permission, reason, bounded evidence references, optimistic version, Core Audit, and Core Idempotency. Governance observations are sidecars and cannot change the formal decision.

Runtime reads authoritative rows directly before route selection. A stored Readiness assessment is evidence, not execution authority.
