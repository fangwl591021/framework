# Release and Rollback

## Release Record

Every prepared Release records:

- `release_id`
- `git_commit_sha`
- `application_version`
- `migration_version`
- `build_artifact_digest`
- `environment`
- `release_status`
- `previous_stable_release_id`
- `created_at`
- `promoted_at`
- `rolled_back_at`

The state path is `prepared → validating → approved → deploying → healthy`. A valid in-progress state may become `failed`; a healthy Release may become `rolled_back`.

Preparation rejects a dirty working tree, an unknown Commit, a non-SHA Commit, an invalid artifact digest, and the untraceable version `latest`. Promotion cannot skip staging and must pass the target gates.

## Rollback Separation

Code rollback and data recovery are separate decisions:

- Backward-compatible Schema permits code rollback to the recorded previous stable Release.
- Destructive Down Migration is forbidden.
- Incompatible Schema without verified Backup evidence requires Forward Fix.
- Restore is eligible only with a completed, restore-verified Backup belonging to the affected Release.
- Data-loss risk is explicit and never hidden by a code-only rollback.

`RollbackPlanner` records request and completion evidence but performs no Production rollback.
