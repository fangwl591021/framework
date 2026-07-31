# Test Matrix

| Area | Evidence |
| --- | --- |
| Local routes | Canonical pages, query preservation, API separation, non-local 404 |
| Trusted context | Unexpected Tenant/Application/actor/provider/model/endpoint/quality fields rejected |
| Budget | Allowlist, exhausted and concurrency fixtures, replay without duplicate accounting |
| Cache | Miss, hit, expiry, cross-Tenant scope, invalid output and retired task rejection |
| Routing | Disabled provider, timeout, two-hop fallback, circuit open, stale completion |
| Output | Structured, unsafe, low-confidence, and unallowlisted intent rejection |
| Authority | No plan, tool, mutation, callback, confirmation, or formal-intent replacement |
| Evidence | Opaque support code, bounded timeline, prompt/response absence |
| Usage | Tenant isolation, Platform Operator aggregate, bounded range and grouping |
| Browser | `textContent` rendering, XSS-safe output, Same-Origin, CSRF |
| Production | Production entry and migration unchanged; production bundle token scan |
| Regression | Legacy tests, typecheck, production/local builds, audit, migrations, health/readiness |

Local D1 verification applies formal migrations `0001` through `0008`, then the isolated `local-demo/schema.sql`. The local schema is not a formal migration and is never applied remotely.
