# Module Registry Entry Template

> 每個 Entry 必須與 Module Contract、Module Lifecycle 及版本一致。Registry Entry 不代表 Module 已部署、Implemented 或 Production Verified。

## Blank Entry

| Metadata | Value | 填寫說明 |
| --- | --- | --- |
| `module_id` | [required] | 唯一 kebab-case ID |
| `display_name` | [required] | 人類可讀名稱 |
| `description` | [required] | 一句責任摘要 |
| `category` | [required] | Module 類別 |
| `lifecycle_status` | [required] | Module Lifecycle 階段 |
| `current_version` | [required] | SemVer 或 N/A |
| `owner` | [required] | Module Owner 或 Unassigned |
| `minimum_core_version` | [required] | 最低相容版本或 N/A |
| `maximum_core_version` | [required] | 最高相容版本或 N/A |
| `dependencies` | [required] | 必要依賴與版本 |
| `optional_dependencies` | [required] | 選用依賴或 None |
| `supported_adapters` | [required] | Adapter 清單或 None |
| `feature_flag_key` | [required] | Feature Flag Key 或 None |
| `tenant_scoped` | [required] | Yes／No 與說明 |
| `shop_scoped` | [required] | Yes／No／Optional 與說明 |
| `contains_pii` | [required] | Yes／No／Unknown |
| `audit_required` | [required] | Yes／No／TBD |
| `idempotency_required` | [required] | Yes／No／TBD |
| `stable_use_cases` | [required] | 證據引用；非 Stable 填 None |
| `source_assets` | [required] | Candidate Source＋Commit；無則 None |
| `documentation_path` | [required] | 文件路徑 |
| `contract_path` | [required] | Module Contract 路徑 |
| `deprecation_date` | [required] | 日期或 None |
| `replacement_module` | [required] | Module ID 或 None |
| `approval_reference` | [required] | ADR／PR／批准紀錄或 None |

## Example Entry: point-engine

```text
Example Only
Not Implemented
Not Approved
```

| Metadata | Example Value |
| --- | --- |
| `module_id` | point-engine |
| `display_name` | Point Engine |
| `description` | 管理 Tenant Scope 內可追溯的 Point Account 與異動 |
| `category` | Domain Module Candidate |
| `lifecycle_status` | Candidate |
| `current_version` | N/A |
| `owner` | Unassigned |
| `minimum_core_version` | N/A |
| `maximum_core_version` | N/A |
| `dependencies` | Platform Core Interface candidates；尚未批准 |
| `optional_dependencies` | None |
| `supported_adapters` | None confirmed |
| `feature_flag_key` | TBD |
| `tenant_scoped` | Yes；概念要求，尚未 Implemented |
| `shop_scoped` | Optional；由 Tenant Policy 決定，尚未 Implemented |
| `contains_pii` | Unknown；需 Security Review |
| `audit_required` | TBD；預期高風險操作需要 |
| `idempotency_required` | TBD；預期 Command 需要 |
| `stable_use_cases` | None |
| `source_assets` | Candidate Source 尚未完成 Read-only Audit |
| `documentation_path` | TBD |
| `contract_path` | TBD |
| `deprecation_date` | None |
| `replacement_module` | None |
| `approval_reference` | None |

此範例只顯示 metadata 填寫方式，不是 point-engine 的正式 Contract、設計批准、實作或 Production Verification。
