# Registry Entry: attendance-engine

> Lifecycle Status: Candidate · Implementation: Not Implemented · Production Use: Not Allowed

| Metadata | Value |
| --- | --- |
| `module_id` | attendance-engine |
| `display_name` | Attendance Engine |
| `description` | 驗證 Physical／Online Attendance 並防止重複 Confirmation |
| `category` | Transactional Domain Module Candidate |
| `lifecycle_status` | Candidate |
| `current_version` | 0.1.0-draft |
| `owner` | Unassigned |
| `minimum_core_version` / `maximum_core_version` | N/A / N/A |
| `dependencies` | Identity、Membership、Permission、Event public contracts；Audit／Idempotency candidates |
| `optional_dependencies` | Point、Notification public contracts |
| `supported_adapters` | QR、Location、Meeting／Messaging candidates；None confirmed |
| `feature_flag_key` | module.attendance.enabled（candidate） |
| `tenant_scoped` | Yes；mandatory |
| `shop_scoped` | Optional；Event／Session／Location policy |
| `contains_pii` | Member reference；optional sensitive Location／Meeting evidence |
| `pii_classification` | Restricted when location exists; otherwise Confidential |
| `audit_required` / `idempotency_required` | Yes / Yes |
| `stable_use_cases` | None |
| `source_assets` | K-Link、LINE 專案為 Candidate Sources；未完成 Read-only Audit，不宣稱採用 |
| `documentation_path` / `contract_path` | `docs/33-SCENARIO-VALIDATION-MATRIX.md` / `docs/37-ATTENDANCE-ENGINE-CONTRACT.md` |
| `deprecation_date` / `replacement_module` | None / None |
| `approval_reference` | ADR-012；Contract approval pending |

Contract Proposed；Not Verified；Attendance Engine 不直接修改 Point Account。
