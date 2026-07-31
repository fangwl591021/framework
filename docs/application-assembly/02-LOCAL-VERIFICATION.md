# Application Assembly Local Verification

Verification is isolated to Local D1 and applies formal migrations
`0001_phase_1_core.sql`, `0002_event_engine.sql`, and
`0003_application_assembly.sql` to a fresh database.

Covered evidence:

- 26 tables, 48 explicit indexes, 33 triggers, and tenant-aware foreign keys.
- Application A purchased and enabled Event Engine: navigation, dashboard, and
  guarded Event Service access succeed.
- Application B without entitlement: navigation is empty and Service returns
  `MODULE_NOT_ENTITLED`.
- Disable and re-enable: Service returns `MODULE_NOT_ENABLED` while disabled,
  Event data remains, and access recovers after enablement.
- Tenant isolation, untrusted client Application context, permission denial,
  expired trial, dependency guard, and configuration secret rejection.
- Idempotency replay creates no duplicate entitlement, history, or enablement.
- Query-plan inspection confirms composite indexes for Application/module
  access, navigation, entitlement history, and configuration lookup.

This evidence does not approve Remote D1, Production migration, deployment, or
Production use.
