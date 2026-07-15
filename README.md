# Platform Core Framework

Platform Core Framework 是未來 SaaS 產品共用的母框架，用來定義跨專案一致的架構語言、模組邊界、開發標準與治理原則。

## 目的

- 建立可重複使用的 SaaS 核心能力藍圖。
- 降低不同專案重複設計、重複開發與維護分歧。
- 讓新 Application 從一致的 Identity、Tenant、Permission、API 與 Domain Module 邊界開始。
- 以文件先行方式建立未來模組化實作、審查與驗收依據。

## 願景

Platform Core 將成為所有 SaaS Application 的共同起點。它不代表單一產品，而是一套可持續演進、可跨國家、跨 Tenant 與跨通道延伸的平台標準。

## 核心定位

- **所有 SaaS 共用核心**：集中定義可共用的平台能力與標準。
- **Framework 不屬於任何客戶**：不得放入客戶專屬規則、品牌設定或商業流程。
- **所有功能皆模組化**：每項能力以清楚邊界、穩定 Interface 與獨立驗證為原則。
- **文件先於程式**：先確認責任、資料邊界、契約與驗收方式，再進入實作。
- **Core 與 Application 分離**：Application 可以組合或擴充能力，但不得把客戶邏輯回灌為 Platform Core 預設行為。

## Framework 五層架構

1. **Platform Core**：跨產業、跨 Tenant、跨通道的底層共用能力與規範。
2. **Domain Module**：可獨立啟用、安裝、測試與版本化的領域能力。
3. **Adapter**：隔離 LINE、WhatsApp、Google、AI、OCR 等外部平台與供應商差異。
4. **Extension**：透過正式擴充點承載特定客戶或產業流程。
5. **Application／Tenant Configuration**：組合能力並以 Configuration 表達 Tenant 差異。

詳細依賴與判斷規則見 [Framework Layers](docs/10-FRAMEWORK-LAYERS.md)。

## 目前階段

Framework 目前只處於文件與架構治理階段：

- 尚未建立任何 Framework 程式、Worker、Schema、Migration 或部署設定。
- 尚未批准任何舊專案程式進入 Platform Core。
- Feature Asset Map 中的項目全是待稽核候選，不代表已完成模組化或跨專案驗證。

## Repository 治理

- `main` 應維持穩定、可閱讀且內容彼此一致。
- 未來文件與程式修改應由獨立 Branch 提交，經 Pull Request 審查後才合併。
- 破壞性架構決策需建立 Architecture Decision Record（ADR）。
- 不得以直接修改 Platform Core 的方式解決單一客戶需求。

## 文件索引

| 文件 | 用途 |
| --- | --- |
| [00-VISION](docs/00-VISION.md) | 定義 Platform Core 的長期願景與平台方向 |
| [01-PLATFORM-BLUEPRINT](docs/01-PLATFORM-BLUEPRINT.md) | 描述五層架構、核心能力、身份與 Tenant 邊界 |
| [02-FEATURE-ASSET-MAP](docs/02-FEATURE-ASSET-MAP.md) | 盤點舊功能資產候選、成熟度、風險與 Promotion Status |
| [03-DEVELOPMENT-STANDARD](docs/03-DEVELOPMENT-STANDARD.md) | 定義模組化、檔案責任、解耦、測試與 API 原則 |
| [04-CLOUDFLARE-STANDARD](docs/04-CLOUDFLARE-STANDARD.md) | 定義 Cloudflare 各項服務的責任邊界 |
| [05-DATABASE-STANDARD](docs/05-DATABASE-STANDARD.md) | 定義核心資料概念與資料治理原則，不含 Schema |
| [06-IDENTITY-CENTER](docs/06-IDENTITY-CENTER.md) | 定義 Platform User、成員身份與 Identity Mapping |
| [07-ENGINE-DESIGN](docs/07-ENGINE-DESIGN.md) | 定義 Engine 清單與標準邊界契約模板 |
| [08-AI-DEVELOPMENT-RULE](docs/08-AI-DEVELOPMENT-RULE.md) | 定義 AI、Codex 與工程師共同作業規則 |
| [09-PROJECT-CHECKLIST](docs/09-PROJECT-CHECKLIST.md) | 提供所有新 Application 的啟動、治理與交付檢查清單 |
| [10-FRAMEWORK-LAYERS](docs/10-FRAMEWORK-LAYERS.md) | 正式定義 Platform Core、Domain Module、Adapter、Extension 與 Application 五層 |
| [11-MODULE-LIFECYCLE](docs/11-MODULE-LIFECYCLE.md) | 定義從 Idea 到 Retired 的晉升、批准、降級與版本要求 |
| [12-VERSION-DEPENDENCY-RULES](docs/12-VERSION-DEPENDENCY-RULES.md) | 定義 Semantic Versioning、依賴方向與 Module 協作方式 |
| [13-ADR-TEMPLATE](docs/13-ADR-TEMPLATE.md) | 提供 Architecture Decision Record 範本與狀態規則 |
| [14-MODULE-PROMOTION-STANDARD](docs/14-MODULE-PROMOTION-STANDARD.md) | 定義舊功能晉升前的問題、評分與結論分類 |
| [15-TENANT-DATA-BOUNDARY](docs/15-TENANT-DATA-BOUNDARY.md) | 定義 Platform User、Identity Mapping 與 Tenant Membership 隔離 |
| [16-CONFIGURATION-EXTENSION-RULES](docs/16-CONFIGURATION-EXTENSION-RULES.md) | 劃分 Configuration、Policy、Strategy 與 Extension |
| [17-LEGACY-ASSET-EXTRACTION](docs/17-LEGACY-ASSET-EXTRACTION.md) | 定義舊專案唯讀稽核與資產萃取流程 |
