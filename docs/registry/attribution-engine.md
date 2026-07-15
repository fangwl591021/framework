# Registry Entry: attribution-engine

> Lifecycle Status: Candidate · Implementation: Not Implemented · Production Use: Not Allowed

| Metadata | Value |
| --- | --- |
| `module_id` | attribution-engine |
| `display_name` | Attribution Engine |
| `description` | 管理 Share Link、Touch、Conversion Reference 與版本化 Attribution Decision |
| `category` | Marketing Transaction Domain Module Candidate |
| `lifecycle_status` | Candidate |
| `current_version` | 0.1.0-draft |
| `owner` | Unassigned |
| `minimum_core_version` / `maximum_core_version` | N/A / N/A |
| `dependencies` | Identity、Membership、Permission、Conversion producer public contracts；Audit／Idempotency candidates |
| `optional_dependencies` | Future Commission、Notification（not approved） |
| `supported_adapters` | None confirmed；Web／QR／Messaging candidates |
| `feature_flag_key` | module.attribution.enabled（candidate） |
| `tenant_scoped` | Yes；mandatory |
| `shop_scoped` | Optional；must remain within Tenant |
| `contains_pii` | Anonymous／Member business references；no Provider token |
| `pii_classification` | Confidential |
| `audit_required` / `idempotency_required` | Yes / Yes |
| `stable_use_cases` | None |
| `source_assets` | TravelKeeper、Action 為 Candidate Sources；未完成 Read-only Audit，不宣稱採用 |
| `documentation_path` / `contract_path` | `docs/28-ATTRIBUTION-MODEL.md` / `docs/36-ATTRIBUTION-ENGINE-CONTRACT.md` |
| `deprecation_date` / `replacement_module` | None / None |
| `approval_reference` | ADR-005、ADR-011、ADR-012；Contract approval pending |

Contract Proposed；Not Verified；不得支付 Commission 或執行 Production Attribution。
