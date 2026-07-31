# Local Verification

The verification boundary is isolated Local D1 only.

- Fresh apply migrations `0001` through `0005`.
- Inspect 42 tables, 89 named indexes, 58 triggers, foreign keys, and seven Traffic permissions.
- Force migration `0005` to fail before permission-guard restoration and verify atomic rollback.
- Verify Webhook active-lease deferral, one-winner takeover, fencing, Stored Result recovery, bounded terminal attempts, and TTL non-bypass.
- Verify 201 tests total (141 runtime/unit and 60 Local D1), exact concurrent rate/budget winners, token-idempotent release, lease expiry, counter overflow fail-closed, one half-open probe, stale-probe rejection, and degradation compare-and-swap.
- Verify parameterized D1 repositories, bounded pagination, query plans, Audit, Idempotency, `/health`, `/ready`, typecheck, build, audit, Markdown links, encoding, secret scans, and `git diff --check`.

Passing this suite means Locally Verified, not Production Ready.