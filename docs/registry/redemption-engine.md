# Registry Entry: redemption-engine

> Lifecycle Status: Candidate · Implementation: Not Implemented · Production Use: Not Allowed

| Metadata | Value |
| --- | --- |
| `module_id` | redemption-engine |
| `display_name` | Redemption Engine |
| `description` | 管理 Merchant-verified Redemption Intent、Result、Receipt 與 Reversal |
| `category` | Transactional Domain Module Candidate |
| `lifecycle_status` | Candidate |
| `current_version` | 0.1.0-draft |
| `owner` | Unassigned |
| `minimum_core_version` / `maximum_core_version` | N/A / N/A |
| `dependencies` | Identity、Membership、Permission、Point public contracts；Audit／Idempotency candidates |
| `optional_dependencies` | Notification、Coupon public contracts |
| `supported_adapters` | QR／Identity candidates；None confirmed |
| `feature_flag_key` | module.redemption.enabled（candidate） |
| `tenant_scoped` | Yes；mandatory |
| `shop_scoped` | Yes for Merchant operation；Point availability follows Program Policy |
| `contains_pii` | Merchant／Member business references；token is Restricted |
| `pii_classification` | Restricted |
| `audit_required` / `idempotency_required` | Yes / Yes |
| `stable_use_cases` | None |
| `source_assets` | K-Link、LINE 專案、Action 為 Candidate Sources；未完成 Read-only Audit，不宣稱採用 |
| `documentation_path` / `contract_path` | `docs/33-SCENARIO-VALIDATION-MATRIX.md` / `docs/38-REDEMPTION-ENGINE-CONTRACT.md` |
| `deprecation_date` / `replacement_module` | None / None |
| `approval_reference` | ADR-009、ADR-012；Contract approval pending |

Contract Proposed；Not Verified；一般 Scanner／LIFF 不是安全邊界，Production Use 不允許。
