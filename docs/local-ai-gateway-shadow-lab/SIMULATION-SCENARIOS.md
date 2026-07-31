# Simulation Scenarios

All scenarios are deterministic, replayable, network-free, secret-free, and bounded.

| Scenario | Evidence focus |
| --- | --- |
| `deterministic_shortcut_hit` | Deterministic shortcut result |
| `cache_miss_local_provider_success` | Local provider route after cache miss |
| `cache_hit` | Identical scoped cache replay |
| `cache_expired` | Expired entry rejected, local route retried |
| `cross_tenant_cache_isolation` | Same input produces independent Tenant scope |
| `retired_task_cache_rejected` | Retired task cannot consume cache |
| `budget_exceeded` | Atomic budget rejection |
| `provider_disabled` | Disabled adapter fails closed |
| `provider_timeout` | Local deterministic provider failure fixture |
| `fallback_to_deterministic_local` | Two-hop maximum fallback |
| `invalid_structured_output` | Schema validation rejection |
| `unsafe_output` | Unsafe output rejection |
| `low_confidence` | Clarification required |
| `unallowlisted_intent` | Intent allowlist rejection |
| `circuit_open` | Circuit-open admission rejection |
| `stale_provider_completion` | Lease/fence rejects stale completion |
| `idempotent_replay` | Same key and fingerprint replays stored result |
| `request_conflict` | Same key and changed fingerprint conflicts |

Safe timelines include only stages actually attempted. Failed paths use `budget_rejected`, `provider_failed`, `fallback_started`, `output_rejected`, or `request_failed` as appropriate.
