# Registry Entry: point-engine

> Lifecycle Status: Candidate · Implementation: Not Implemented · Production Use: Not Allowed

| Metadata | Value |
| --- | --- |
| `module_id` | point-engine |
| `display_name` | Point Engine |
| `description` | 管理 Tenant-scoped Point Program、Account、Ledger 與 Balance Projection |
| `category` | Transactional Domain Module Candidate |
| `lifecycle_status` | Candidate |
| `current_version` | 0.1.0-draft |
| `owner` | Unassigned |
| `minimum_core_version` / `maximum_core_version` | N/A / N/A |
| `dependencies` | Identity、Membership、Permission public contracts；Audit／Idempotency candidates |
| `optional_dependencies` | Attendance、Redemption、Notification public contracts |
| `supported_adapters` | None confirmed |
| `feature_flag_key` | module.point.enabled（candidate） |
| `tenant_scoped` | Yes；mandatory |
| `shop_scoped` | Optional；default Shop Isolated，explicit Program Policy required |
| `contains_pii` | No direct PII expected；Confidential business references |
| `pii_classification` | Confidential |
| `audit_required` / `idempotency_required` | Yes / Yes |
| `stable_use_cases` | None |
| `source_assets` | Action、K-Link、LINE 專案為 Candidate Sources；未完成 Read-only Audit，不宣稱採用 |
| `documentation_path` / `contract_path` | `docs/26-POINT-ACCOUNT-MODEL.md` / `docs/34-POINT-ENGINE-CONTRACT.md` |
| `deprecation_date` / `replacement_module` | None / None |
| `approval_reference` | ADR-006、ADR-009、ADR-012；Contract approval pending |

Contract Proposed；Not Verified；Registry Entry 不載入 Runtime、不允許 Production Use。
