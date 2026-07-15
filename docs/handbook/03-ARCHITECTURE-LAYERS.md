# Architecture Layers

> 正式摘要；完整規則以 [Framework Layers](../10-FRAMEWORK-LAYERS.md) 為準

| Layer | Responsibility | Examples | Allowed Dependencies | Forbidden Responsibilities | When to Use |
| --- | --- | --- | --- | --- | --- |
| Platform Core | 跨專案底層能力與規範 | Identity、Tenant、Permission、安全規範 | 抽象 Adapter／公開 Contract | 客戶規則、通道格式、商業流程 | 真正跨 Module 且不可替代 |
| Domain Module | 擁有單一領域資料與行為 | Point、Referral、Attendance | Core 與其他 Module 公開介面 | 直接寫別人 Owned Data、綁定 UI | 可獨立安裝、測試、版本化 |
| Adapter | 驗證與轉換外部 Provider | LINE、Login、OCR、AI | Domain／Core 公開 Interface | 決定點數、推薦、會員資格 | 隔離 Channel／Provider 差異 |
| Extension | 特定產業或 Tenant 的完整特殊流程 | K-Link Location Policy | Hook、Event、Policy、Strategy | 修改 Core private implementation | Configuration／Strategy 不足時 |
| Application／Tenant Configuration | 組合能力與表達有限差異 | Module 開關、點數值、語系 | 選用 Module、Adapter、Extension | 任意程式碼、繞過安全 Boundary | 組裝產品與 Tenant 差異 |

## 需求放置判斷

| 需求 | 應放位置 |
| --- | --- |
| LINE Webhook 格式轉換 | Adapter |
| 贈點數值 | Configuration |
| 點數計算策略 | Policy／Strategy |
| K-Link 地點簽到特殊流程 | Extension |
| Point Ledger | Domain Module |
| Tenant Isolation | Platform Core |

判斷順序：Configuration → Policy／Strategy → Extension → Domain Module → Platform Core。客戶名稱與 `tenant_id` 特判不得下沉到 Core；詳見 [Configuration and Extension Rules](../16-CONFIGURATION-EXTENSION-RULES.md)。
