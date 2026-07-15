# Module Registry Standard

## 目的

Module Registry 是 Platform Core Candidate，用於提供 Framework 中 Domain Module 的治理索引：

- 記錄 Module、Lifecycle Status、版本與 Owner
- 記錄必要與選用依賴
- 記錄支援 Adapter 與 Feature Flag
- 記錄相容的 Platform Core 版本
- 記錄是否允許正式使用
- 記錄棄用日期與替代 Module

Module Registry 目前狀態為 `Candidate`，尚未 Implemented、Production Ready 或 Core Approved。

## Metadata 標準

| 欄位 | 必填 | 規則 |
| --- | --- | --- |
| `module_id` | 是 | 唯一、穩定、kebab-case |
| `display_name` | 是 | 人類可讀名稱 |
| `description` | 是 | 一句責任摘要，不寫行銷口號 |
| `category` | 是 | Domain Module 類別 |
| `lifecycle_status` | 是 | 必須符合 Module Lifecycle |
| `current_version` | 是 | Semantic Versioning；Idea／Candidate 可標 N/A |
| `owner` | 是 | Module Owner；未指定填 Unassigned |
| `minimum_core_version` | 是 | 最低相容 Platform Core 版本或 N/A |
| `maximum_core_version` | 是 | 最高相容版本或未限制說明 |
| `dependencies` | 是 | 必要 Module 與版本範圍 |
| `optional_dependencies` | 是 | 選用 Module 與版本範圍 |
| `supported_adapters` | 是 | 支援 Adapter；無則填 None |
| `feature_flag_key` | 是 | Feature Flag Key；無則填 None |
| `tenant_scoped` | 是 | 是否包含 Tenant Scope |
| `shop_scoped` | 是 | 是否支援 Brand／Shop Scope |
| `contains_pii` | 是 | 是否處理 PII |
| `audit_required` | 是 | 是否需要 Audit Log |
| `idempotency_required` | 是 | 是否需要 Idempotency |
| `stable_use_cases` | 是 | Stable 證據引用；非 Stable 必須為 None |
| `source_assets` | 是 | Candidate Source 與 Commit；無則填 None |
| `documentation_path` | 是 | Module 說明文件路徑 |
| `contract_path` | 是 | Module Contract 路徑 |
| `deprecation_date` | 是 | 未棄用填 None |
| `replacement_module` | 是 | 替代 Module；無則填 None |
| `approval_reference` | 是 | ADR、PR 或批准紀錄；未批准填 None |

## Registry 邊界

Module Registry：

- 不執行商業邏輯。
- 不負責部署、載入或執行 Module。
- 不保存 Token、Secret、UID、PII 或 Tenant 業務資料。
- 不代表 Registry 中的 Module 已部署、Implemented 或 Production Verified。
- 不得自行改變 Module Lifecycle。
- 必須與 Module Contract、版本、Feature Flag 與 Deprecation 狀態一致。

## 狀態一致性

- `Candidate` 不得填入 Production Stable Use Case。
- `Experimental` 必須有限定 Feature Flag 與試用 Scope。
- `Stable` 必須引用至少兩個具實質差異的正式使用場景。
- `Core Approved` 必須引用 Tony 批准的 ADR 或等效正式紀錄。
- `Deprecated` 必須記錄日期、替代方案與遷移期限。
- `Retired` 不得標示允許新 Application 使用。

## 維護流程

1. Module Owner 建立或更新 Registry Entry。
2. Platform Architect 比對 Module Contract、Lifecycle 與版本。
3. Reviewer 檢查依賴、Tenant Boundary、Security 與連結。
4. 需要晉升或 Breaking Change 時，由 Architecture Owner Tony 批准。
5. 變更經 Branch／Pull Request 合併後才成為正式 Registry 文件。

本 Sprint 只定義 Markdown metadata 標準，不建立 JSON、資料表、Schema 或 Registry Runtime。

模板見 [Module Registry Entry Template](templates/MODULE-REGISTRY-ENTRY-TEMPLATE.md)。
