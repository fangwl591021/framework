# Deployment Gates

The foundation defines:

- Build Gate
- Test Gate
- Migration Gate
- Security Gate
- Backup Gate
- Staging Health Gate
- Production Approval Gate
- Post-deployment Health Gate
- Rollback Gate

Production promotion requires every Gate. Staging promotion requires Build, Test, Migration, Security, Backup, and Rollback evidence. A rejected Gate produces a bounded reason list and performs no deployment.

`ReleaseHealthEvaluator` consumes internal dependency results and emits a bounded verification report. Safe output contains only health state, Release state, counts, and approved reason codes. It excludes Secret values, environment variables, internal paths, Database IDs, Binding names, stack traces, and provider credentials.

This Contract is locally testable but has no deployment operator, remote binding, or Production approval.
