# Local Verification

The verification boundary is isolated Local D1 only.

- Fresh apply migrations `0001` through `0005`.
- Inspect 42 tables, 87 named indexes, 58 triggers, foreign keys, and seven Traffic permissions.
- Force migration `0005` to fail before permission-guard restoration and verify atomic rollback.
- Verify first/replay/conflict/TTL webhook behavior, rate limit burst and retry, Tenant and platform isolation, circuit transitions, degradation hysteresis, backpressure idempotency, and safe responses.
- Verify parameterized D1 repositories, bounded pagination, query plans, Audit, Idempotency, `/health`, `/ready`, typecheck, build, audit, Markdown links, encoding, secret scans, and `git diff --check`.

Passing this suite means Locally Verified, not Production Ready.