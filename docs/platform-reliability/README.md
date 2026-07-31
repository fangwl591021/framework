# Platform Reliability Foundation

> Platform Service Candidate · Contract Approved by Tony · Architecture／Security Review Approved · Locally Implemented · Locally Verified · Not Deployed · Production Use Not Allowed

Platform Reliability Foundation establishes reusable environment, release, rollback, backup, restore, deployment-gate, and release-health boundaries. It is not a Business Engine and owns no customer workflow.

## Reading Order

1. [Environment Separation](01-ENVIRONMENT-SEPARATION.md)
2. [Release and Rollback](02-RELEASE-ROLLBACK.md)
3. [Backup and Restore](03-BACKUP-RESTORE.md)
4. [Deployment Gates](04-DEPLOYMENT-GATES.md)
5. [Local Verification](05-LOCAL-VERIFICATION.md)
6. [Framework 2.0 Roadmap](../FRAMEWORK-2.0-ROADMAP.md)

## Current Boundary

- Three logical environments have distinct D1 and Secret-provider references.
- No formal D1, Secret, R2, Google Drive, or Production Binding is created.
- Local simulation repositories are test authority only and are not Production persistence.
- Local Filesystem is a Node／CI test adapter and is not exported through the Worker-facing barrel.
- R2, Google Drive, and external object storage adapters fail closed, including deletion.
- The provider-neutral Google Drive configuration contract accepts only trusted environment and Secret references; it contains no provider adapter or repository-held Folder ID.
- No Remote D1, provider API, deployment, Production backup, or Production restore is performed.
