# Failure Isolation and Retention Policy

## Sidecar Failure Isolation

Observability and alerting are sidecar capabilities. They receive an already
completed business result and never own or retry the business mutation.
Observation persistence, Incident aggregation, policy evaluation, alert
delivery, retry scheduling, and local fallback failures therefore cannot change
that business result.

An Observation that cannot be aggregated remains formally stored with an
unaggregated state. The internal reconciliation operation is idempotent and
creates at most one immutable Incident lifecycle link. Alert delivery uses a
deterministic delivery key; safe fallback evidence prevents a provider delivery
from being repeated when primary alert-history persistence is unavailable.

Fallback evidence is bounded to correlation reference, operation, safe reason
code, timestamp, and counter. It never contains Request Body, raw UID,
credentials, Secret values, stack traces, provider payloads, or SQL.

Core Audit remains governed by the Core mutation policy. Observability neither
replaces Audit nor weakens an Audit requirement. Observability reconciliation
and retention mutations create their own minimal Core Audit records.

## Observation Retention

Every Observation has `retention_expires_at`. Expiry only makes an active
Observation eligible; it does not authorize arbitrary deletion. Runtime APIs,
Tenant Admins, and Platform Admins cannot delete or anonymize Observation
evidence.

Only a future governed Retention Executor may invoke the internal cleanup
service. Each execution must have an explicit Platform or Tenant scope, a limit
from 1 through 100, the trusted Retention Executor service actor, an Idempotency key, and minimal
Audit. Cleanup is deterministic, bounded, Tenant-safe, and idempotent. This
Sprint creates no Queue, Cron, scheduler, public route, or deployment.

Eligible Observation evidence is anonymized rather than deleted. Correlation,
trace, actor digest, and bounded metadata are removed; aggregate counters,
timestamps, classification, and the immutable Incident relationship remain.
Consequently Incident counts and historical consistency do not depend on
retained sensitive diagnostic references.

## Incident History

Incidents and Incident lifecycle evidence cannot be generally deleted.
Lifecycle and reopen evidence remain immutable. An Incident may later be marked
archived through a separately governed lifecycle operation, but archival never
removes the Incident or its history.

## Support Code Expiry

Support Code mappings expire after 30 days and then stop resolving for every
Tenant caller. Expiry replaces correlation, trace, and Observation references
with an immutable expired tombstone; it does not expose the original
correlation identifier or remove the Incident. Expiry is Tenant-safe and
idempotent. A Platform Operator still requires the formal diagnostic permission
and retained underlying evidence; expiry creates no authorization bypass.
