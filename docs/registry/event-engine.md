# Registry Entry: event-engine

> Lifecycle Status: Candidate · Contract: Proposed · Implementation: Locally Implemented · Verification: Locally Verified · Production Use: Not Allowed

| Metadata | Value |
| --- | --- |
| `module_id` | event-engine |
| `display_name` | Event Engine |
| `description` | Tenant-scoped events, sessions, dynamic registration, capacity／waitlist, check-in and statistics |
| `category` | Domain Module Candidate |
| `lifecycle_status` | Candidate |
| `current_version` | 0.1.0-draft |
| `owner` | Unassigned |
| `minimum_core_version` / `maximum_core_version` | PR #14 Runtime Phase 1 local baseline / Not bounded |
| `dependencies` | Identity Core, Tenant Access, Authorization, Core Operations |
| `optional_dependencies` | Future Notification, Attendance, Payment and Calendar public contracts |
| `supported_adapters` | Identity channel, share target, notification, payment, calendar and QR ports; no production implementation |
| `feature_flag_key` | None approved |
| `tenant_scoped` | Yes；mandatory on every owned record and repository query |
| `shop_scoped` | No in MVP |
| `contains_pii` | Yes；Tenant-defined registration answers may be Confidential |
| `audit_required` / `idempotency_required` | Yes / Yes through Core Operations |
| `stable_use_cases` | None |
| `source_assets` | TDA and K-Link remain Candidate Sources only；no code copied |
| `documentation_path` | `docs/event-engine/README.md` |
| `contract_path` | `docs/event-engine/01-EVENT-ENGINE-CONTRACT.md` |
| `deprecation_date` / `replacement_module` | None / None |
| `approval_reference` | Pending Architecture Owner review |

Event Engine is not Platform Core. Local implementation and verification do not imply Contract approval, Experimental／Stable lifecycle, deployment or Production readiness.
