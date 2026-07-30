# Event Engine Local Verification

> Evidence scope: isolated Local D1 and local Worker bundle only.

## Migration Evidence

- `migrations/0001_phase_1_core.sql` supplies the Core dependency.
- `migrations/0002_event_engine.sql` creates exactly ten Event-owned tables.
- Fresh tests reset an empty database and apply only formal migrations.
- `sqlite_master`, `PRAGMA foreign_keys` and `PRAGMA foreign_key_check` are inspected.
- Tests contain no fixture `CREATE TABLE`, `CREATE INDEX` or `CREATE TRIGGER`.

## Scenario Evidence

The Local D1 suite verifies:

1. Create and edit an Event.
2. Add multiple Sessions and dynamic fields.
3. Publish and create an adapter-neutral Share Payload.
4. Resolve a channel identity to Platform User, then register.
5. Select a unique confirmed capacity winner and waitlist winner.
6. Reject duplicate Registration and full waitlist.
7. Update answers, cancel Registration and promote waitlist.
8. View bounded roster with answers, payment status and check-in state.
9. Verify manual and HMAC-signed QR Check-in.
10. Reject tampered, expired and replayed QR effects.
11. Read Registration, attendance and share-touch statistics.
12. Enforce Core Permission mapping and cross-Tenant isolation.
13. Replay Stored Results and reject changed fingerprints.
14. Record minimal Audit without answer or token payload copies.
15. Preserve existing Runtime Foundation `/health` and `/ready`.

## Safety Boundary

```text
Local D1: Executed and Verified
Remote D1: Not Accessed
Production Migration: Not Executed
LINE／LIFF API: Not Called
Payment Provider: Not Called
Google Calendar: Not Called
Secret／Production Binding: Not Created
Deployment: Not Performed
Production Verification: Not Verified
```

Passing this suite does not approve the Contract, external API, Adapter, deployment or Production use.
