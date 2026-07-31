# Business Network Permission and Data Boundary

## Domain Permissions

| Permission | Purpose |
| --- | --- |
| `network:read` | Read Partner／Relationship data |
| `network:manage` | Mutate Partner／Relationship data |
| `referral:read` | Read referral relationship and touch results |
| `referral:manage` | Create Link／Touch records |
| `sales:read` | Read Sale／Attribution |
| `sales:manage` | Record Sale／Attribution and lifecycle changes |
| `commission:read_self` | Read only the caller's active Partner commissions |
| `commission:read_all` | Read Tenant-wide Commission summaries |
| `commission:manage` | Manage Rule and Commission lifecycle |
| `team:read` | Read Team performance |
| `team:manage` | Manage Teams and memberships |

These are Domain Module Permissions. No Permission is automatically granted to `tenant_owner`, `tenant_admin` or `tenant_member`. A Tenant Custom Role must explicitly map the required keys.

## Enforcement

- Every repository method requires `tenantId`.
- Every owned row contains `tenant_id`.
- Composite foreign keys bind child references to the same Tenant.
- Administrative mutations require active Membership plus explicit Permission.
- Self queries derive Partner identity from Membership → Platform User → active Partner.
- UI hiding, URLs and caller headers are never authorization evidence.
- Construction requires a `BusinessNetworkModuleAccessPort` bound to a trusted Application context.
- The port must reject unavailable, unentitled or disabled module access before Domain Permission evaluation.
- The module does not own Application entitlement data and cannot accept a client-selected Application header as trusted context.

## Sensitive Data

Visitor and buyer references accept only `digest:<hex>` or `user:<UUIDv7>`. Raw external provider subjects, access tokens, Secrets and payment credentials are rejected or outside the interface.

Audit contains action, resource reference, outcome and correlation only. Stored Results redact visitor and buyer references. Domain SQL is parameterized and never uses `SELECT *`.
