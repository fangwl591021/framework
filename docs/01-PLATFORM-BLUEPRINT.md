# Platform Blueprint

## 高層架構

Platform Core Framework 使用五層架構。穩定依賴由 Application 朝 Platform Core 前進；外部平台透過 Adapter 接入；Tenant 或產業差異留在 Configuration、Policy、Strategy 或 Extension。

```text
Application / Tenant Configuration
                ↓
             Extension
                ↓
          Domain Modules
                ↓
          Platform Core
                ↑
             Adapters
                ↑
     LINE / WhatsApp / Google / AI / OCR
```

完整分層規則見 [Framework Layers](10-FRAMEWORK-LAYERS.md)，版本與依賴限制見 [Version and Dependency Rules](12-VERSION-DEPENDENCY-RULES.md)。

## 五層責任

### Platform Core

提供 Identity、Tenant、Permission、Setting、Audit Log、Feature Flag、Domain Event、Idempotency、Common Error Model 與 Observability 等跨專案底層能力或規範。候選項目仍須通過 `Core Approved`，不得預設已實作。

### Domain Module

提供 CRM、Member、Point、Referral、Attribution、Event、OCR、Document、Notification 等可獨立組合的領域能力。每個 Domain Module 擁有自己的資料邊界與公開 Interface。

### Adapter

處理 LINE、WhatsApp、WeChat、Login Provider、AI、OCR、Storage 等外部格式及供應商差異，不承載核心商業規則。

### Extension

承載特定客戶或產業的特殊流程，僅能透過 Hook、Domain Event、Policy、Strategy、Plugin Interface 或 Configuration 擴充。

### Application／Tenant Configuration

Application 組合所需能力；Tenant Configuration 表達模組開關、規則參數、語系、品牌與通道設定，避免為 Tenant 差異修改 Framework。

## 身份與 Tenant 關係

- **Platform User**：代表自然人或平台主體，不直接保存特定 Tenant 的點數、介紹人、會員等級或福利。
- **Identity Mapping**：將 LINE、Google、Apple、Facebook、WhatsApp、Email、Mobile 等外部身份連結至 Platform User。
- **Tenant Membership**：代表 Platform User 在單一 Tenant 的會員關係，擁有該 Tenant 的 Point、Referral、CRM 與 Permission 資料。
- **Shop Membership**：只在 Tenant 內需要 Shop 層關係時建立，不自動擴張成 Tenant 權限。

詳細規則見 [Tenant Data Boundary](15-TENANT-DATA-BOUNDARY.md)。

## 通道無關原則

- Domain Module 不得以 LINE UID、LIFF 或特定訊息格式作為內部核心契約。
- Adapter 將外部事件轉成平台命令或 Query，並將平台結果轉回通道格式。
- 更換 LINE、WhatsApp、Web 或其他通道時，不應改寫 Domain Module 商業規則。
- 通道身份必須先經 Identity Mapping，不能直接成為 Tenant 業務資料主鍵。

## Multi Tenant 資料隔離

- 所有 Tenant Domain 寫入、查詢、Cache、R2 物件、Queue 與 Domain Event 都必須保留 Tenant Scope。
- Domain Module 不得直接操作其他 Domain Module 的資料表。
- Platform User 可跨 Tenant 共用身份，但 Tenant Membership、Point、Referral、CRM、優惠與 Permission 必須隔離。
- 跨 Tenant 操作必須使用明確 Platform 權限與 Audit Log，不得由一般 Tenant 權限推導。

## 核心能力候選

| 能力 | 初步分層 | 責任摘要 |
| --- | --- | --- |
| Identity Center | Platform Core Candidate | 管理 Platform User 與 Identity Mapping |
| Tenant Manager | Platform Core Candidate | 管理 Tenant 生命週期與邊界 |
| Permission Engine | Platform Core Candidate | 依主體、資源、操作與範圍授權 |
| Setting Engine | Platform Core Candidate | 管理 Configuration 繼承與覆寫 |
| API Gateway | Platform Core 規範 Candidate | 統一驗證、路由、版本、限流與觀測 |
| CRM／Point／Referral／Attribution | Domain Module Candidate | 管理各自領域與 Owned Data |
| Content／Event／Document／OCR | Domain Module Candidate | 提供可組合的內容、活動及文件能力 |
| Notification／Media／AI | Domain Module 或 Platform Service Candidate | 以公開 Interface 提供跨 Application 能力 |

以上皆為架構候選分類，不代表已實作、已通過跨專案驗證或已獲批准。

## 強制邊界

- Domain Module 只擁有自己的領域責任與資料。
- 跨 Domain Module 流程透過公開 Interface、Command、Query、Domain Event 或 Queue 協調。
- Platform Core 不認識客戶名稱、特定通道實作或商業規則。
- Adapter 不決定 Point、Referral、Member、優惠或活動規則。
- Application 負責依賴組合，不能直接修改 Platform Core 私有實作。
