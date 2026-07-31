# Dependency Health

`DependencyRegistry` classifies each dependency as required or optional. A probe returns `healthy`, `degraded`, `unavailable`, or `unknown` plus a bounded reason code. `DependencyStatusAggregator` catches probe failures and produces one bounded snapshot.

`/health` remains process liveness only. `/ready` fails closed when a required dependency is unavailable, unknown, or its probe fails. Optional degradation is reported but does not necessarily reject traffic.

The local composition registers Runtime Core and release health as required healthy probes. Local D1 simulation, backup provider, Telegram, LINE, and external-provider states are local or disabled evidence only. No hidden Binding or provider configuration is exposed. `getDependencyHealth()` is an internal permission-checked service, not a public diagnostics endpoint.