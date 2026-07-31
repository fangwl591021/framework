# Secret Reference Lifecycle

The database stores only environment-scoped reference metadata. It has no Secret value, key prefix/suffix, credential read, or Binding. Local, development, staging, and production references cannot be inferred from one another.

The future lifecycle is planned, provisioned, active, rotation due, revoked, and expired. This release accepts only `planned`; therefore external execution remains fail closed. Revoked references cannot be reused.
