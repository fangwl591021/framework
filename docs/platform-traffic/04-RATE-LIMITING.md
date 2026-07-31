# Rate Limiting

The local deterministic adapter implements a bounded window with limit, burst, cooldown, retry-after, and `enforce` or `observe` modes. The key uses trusted environment, Tenant, Application, Module, route, actor digest, and IP digest. Raw identity or client-declared trust is rejected.

Tenant and platform policy spaces are separate. The hierarchical local adapter evaluates the Tenant window first and then a shared platform window, returning distinct evidence without exposing either threshold. Evidence is bounded, retention-scoped, parameterized, and indexed by Tenant/window, global scope/window, and expiry. Production provider selection remains an open deployment decision; the Cloudflare Rate Limiting API is not configured or called.