# Registry Entry: Authorization

> Candidate · Contract Approved · Locally Implemented · Locally Verified · Production Use Not Allowed

| Metadata | Value |
| --- | --- |
| `module_id` | `authorization` |
| `display_name` | Authorization |
| `description` | Evaluates approved Permission from Core or Tenant Role Assignment scope |
| `category` | Platform Core Module |
| `lifecycle_status` | Candidate |
| `contract_status` | Approved |
| `implementation_status` | Locally Implemented |
| `verification_status` | Locally Verified |
| `deployment_status` | Not Deployed |
| `production_use` | Not Allowed |
| `architecture_approval` | Approved by Tony |
| `current_version` | `0.1.0-local` |
| `owner` | Unassigned |
| `minimum_core_version` | N/A |
| `maximum_core_version` | N/A |
| `dependencies` | `identity-core`, `tenant-access`, `core-operations` draft public contracts |
| `optional_dependencies` | None |
| `supported_adapters` | None |
| `feature_flag_key` | None |
| `tenant_scoped` | Yes for Tenant Roles and Assignments; Core templates are Platform scope |
| `shop_scoped` | No in Phase 1 |
| `contains_pii` | No direct PII; Actor references are confidential |
| `audit_required` | Yes |
| `idempotency_required` | Yes for mutations |
| `stable_use_cases` | Local Phase 1 integration tests only |
| `source_assets` | None; no Legacy Runtime source approved |
| `documentation_path` | `docs/runtime-phase-1/00-DECISION-CLOSURE.md` |
| `contract_path` | `docs/runtime-phase-1/03-AUTHORIZATION-CONTRACT.md` |
| `deprecation_date` | None |
| `replacement_module` | None |
| `approval_reference` | PR #12／Approved by Tony |
