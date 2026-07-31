# Backup and Restore

## Provider-neutral Ports

- `BackupProviderPort`
- `BackupStoragePort`
- `RestoreProviderPort`
- `BackupEncryptionPort`
- `BackupNotificationPort`

Google Drive is a future Backup repository, never a primary database. R2, Google Drive, and external object storage adapters are disabled and fail closed in this Sprint. No provider API is called.

The Local Filesystem Test Adapter:

- is limited to Node／CI tests;
- writes checksum-protected artifacts beneath an explicit test root;
- returns a logical reference instead of an absolute internal path;
- is not included in Worker composition or the Worker-facing barrel.

## Backup Evidence

A Backup records its identifier, source environment, database and Release versions, SHA-256 checksum, encryption state, storage provider and reference, lifecycle status, creation and retention timestamps, and restore verification timestamp.

Secrets, Tokens, Credentials, absolute internal paths, Database IDs, and Binding names are excluded. Production strategy must store independent copies outside the primary D1 failure domain and may later use D1 → R2 → Google Drive／cross-cloud replication.

## Restore Drill

The Local Restore Drill:

1. starts from an isolated Local D1 with official Migrations;
2. seeds bounded cross-Tenant data and Audit evidence;
3. creates a Backup Artifact and checksum;
4. removes the test data;
5. restores the Artifact;
6. verifies formal table count, migration ledger, foreign keys, Tenant isolation, Audit evidence, checksum, and critical records;
7. returns recovery point, recovery time, restored count, and integrity error count.

Missing, corrupted, version-mismatched, or integrity-invalid Backups fail closed. The Drill is Local evidence only.
