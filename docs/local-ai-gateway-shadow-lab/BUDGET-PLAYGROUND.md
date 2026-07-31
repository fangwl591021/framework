# Budget Playground

The browser submits only an allowlisted fixture key. It cannot submit numeric limits.

| Fixture | Purpose |
| --- | --- |
| `generous` | Normal local success |
| `tight` | Small but usable limits |
| `exhausted` | Deterministic rejection |
| `concurrency_limited` | Concurrent lease limit already occupied |
| `premium_blocked` | Premium/cost route denied by zero limits |

The service updates only isolated local Platform/Tenant/Application fixture rows and then invokes the formal AI Gateway budget path. Request, unit, cost, and concurrent claims use the existing atomic repository behavior. A replayed Lab idempotency key returns stored evidence before applying a fixture or claiming budget, so it cannot double count.

The display exposes scope, maxima, used units, concurrency, window end, and decision. It never exposes a secret or accepts a client-provided Tenant, Application, quality tier, provider, or model.
