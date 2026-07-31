# Event and Incident Model

## Observation Event

An Observation Event records only bounded, safe evidence: correlation and trace references, environment, release, optional Tenant/Application, module and operation, event type, severity, status, safe reason, optional dependency, digested actor reference, aggregate counters, timestamps, bounded JSON metadata, and retention expiry.

The application accepts no full request or response body, authorization data, cookie, QR material, provider credential, raw external subject, Stack, SQL, or full storage path. Equivalent evidence can aggregate inside a 60-second window; optimistic counters and the D1 transaction keep the stored event and Incident update together.

## Incident

An Incident has one fingerprint within one aggregation scope:

- Tenant configuration and user-action findings use `tenant:<tenantId>`.
- Provider outages use `provider:<dependencyKey>` and may aggregate affected Tenants.
- Platform failures use `platform`.

Lifecycle is `open → acknowledged／investigating／mitigated／resolved`; allowed shortcuts are guarded by a trigger. A resolved fingerprint recurring creates a new Observation Event, reopens the same Incident, increments `reopen_count`, and adds immutable `reopened` evidence. Lifecycle mutations are audited and idempotent.

Observation and Incident evidence is historical: deletion is blocked. Only aggregate counters and lifecycle fields may move in guarded directions.