# Local Verification

Evidence scope: Node／CI tests and isolated Local D1 only.

- Environment isolation and invalid configuration fail closed.
- Client request context cannot select a trusted environment.
- Release manifest integrity and dirty／unknown Commit rejection.
- Release transitions, promotion order, and nine Deployment Gates.
- Code rollback eligibility and Schema incompatibility rejection.
- Backup SHA-256 checksum, idempotent replay, missing and corrupted artifact rejection.
- Disabled R2, Google Drive, and external storage providers.
- Local Filesystem Test Adapter boundary.
- Restore Drill using official `0001＋0002＋0003`.
- 30 formal tables, 3 migration ledger rows, zero FK violations.
- Two-Tenant restoration isolation, Audit evidence, and four critical records.
- Safe release-health output and `/health`／`/ready` regression.
- Audit evidence for environment, Release, Rollback, Backup, and Restore operations.

Current regression: 72 tests PASS（43 unit／runtime and 29 isolated Local D1）.

Not verified: Remote D1, Production Binding, provider API, R2, Google Drive, external storage, deployment, Production rollback, Production restore, RPO, RTO, load, retention, and Security approval.
