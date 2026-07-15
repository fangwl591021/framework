# Registry Entry: referral-engine

> Lifecycle Status: Candidate · Implementation: Not Implemented · Production Use: Not Allowed

| Metadata | Value |
| --- | --- |
| `module_id` | referral-engine |
| `display_name` | Referral Engine |
| `description` | 管理 Tenant-scoped Single-Layer Invitation、Candidate 與 Direct Referral History |
| `category` | Relationship Domain Module Candidate |
| `lifecycle_status` | Candidate |
| `current_version` | 0.1.0-draft |
| `owner` | Unassigned |
| `minimum_core_version` / `maximum_core_version` | N/A / N/A |
| `dependencies` | Identity、Membership、Permission public contracts；Audit／Idempotency candidates |
| `optional_dependencies` | Notification public contract |
| `supported_adapters` | None confirmed；QR／Messaging are adapter candidates |
| `feature_flag_key` | module.referral.enabled（candidate） |
| `tenant_scoped` | Yes；mandatory |
| `shop_scoped` | Optional invitation／eligibility context；relationship remains Tenant-scoped |
| `contains_pii` | No direct PII expected；Member references are Confidential |
| `pii_classification` | Confidential |
| `audit_required` / `idempotency_required` | Yes / Yes |
| `stable_use_cases` | None |
| `source_assets` | TravelKeeper、LINE 專案為 Candidate Sources；未完成 Read-only Audit，不宣稱採用 |
| `documentation_path` / `contract_path` | `docs/27-REFERRAL-RELATIONSHIP-MODEL.md` / `docs/35-REFERRAL-ENGINE-CONTRACT.md` |
| `deprecation_date` / `replacement_module` | None / None |
| `approval_reference` | ADR-005、ADR-007、ADR-010；Contract approval pending |

Contract Proposed；Not Verified；Registry Entry 不包含 Multi-level Revenue 或 Production Runtime。
