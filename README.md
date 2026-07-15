# Platform Core Framework

Platform Core Framework 是未來 SaaS 產品共用的母框架，用來定義跨專案一致的架構語言、模組邊界、開發標準與治理原則。

## 目的

- 建立可重複使用的 SaaS 核心能力藍圖。
- 降低不同專案重複設計、重複開發與維護分歧。
- 讓新專案從一致的 Identity、Tenant、Permission、API 與 Engine 邊界開始。
- 以文件先行的方式，建立未來模組化實作與驗收依據。

## 願景

Platform Core 將成為所有 SaaS 專案的共同起點。它不代表單一產品，而是一套可持續演進、可跨國家、跨租戶與跨通路延伸的平台標準。

## 核心定位

- **所有 SaaS 共用核心**：集中定義可共用的平台能力與標準。
- **Framework 不屬於任何客戶**：不得放入客戶專屬規則、品牌設定或商業流程。
- **所有功能皆模組化**：每項能力以清楚邊界、穩定介面與獨立驗證為原則。
- **文件先於程式**：先確認責任、介面與驗收方式，再進入實作。
- **核心與專案分離**：專案可以組合或擴充模組，但不得把專案邏輯回灌為 Core 的預設行為。

## Sprint 1 範圍

本階段只建立 Platform Core Framework 文件，不包含商業邏輯、應用程式碼、Cloudflare Worker、Database Schema 或部署設定。

## 文件索引

| 文件 | 用途 |
| --- | --- |
| [00-VISION](docs/00-VISION.md) | 定義 Platform Core 的長期願景與平台方向 |
| [01-PLATFORM-BLUEPRINT](docs/01-PLATFORM-BLUEPRINT.md) | 描述平台高層分層與核心能力 |
| [02-FEATURE-ASSET-MAP](docs/02-FEATURE-ASSET-MAP.md) | 盤點已知功能資產來源，不代表已完成模組化 |
| [03-DEVELOPMENT-STANDARD](docs/03-DEVELOPMENT-STANDARD.md) | 定義模組化、解耦、測試與 API 開發原則 |
| [04-CLOUDFLARE-STANDARD](docs/04-CLOUDFLARE-STANDARD.md) | 定義 Cloudflare 各項服務的責任邊界 |
| [05-DATABASE-STANDARD](docs/05-DATABASE-STANDARD.md) | 定義核心資料概念與資料治理原則 |
| [06-IDENTITY-CENTER](docs/06-IDENTITY-CENTER.md) | 定義平台身份、成員身份與登入映射 |
| [07-ENGINE-DESIGN](docs/07-ENGINE-DESIGN.md) | 列出核心 Engine 與單一責任 |
| [08-AI-DEVELOPMENT-RULE](docs/08-AI-DEVELOPMENT-RULE.md) | 定義 AI 輔助開發的分析、設計與修改規則 |
| [09-PROJECT-CHECKLIST](docs/09-PROJECT-CHECKLIST.md) | 提供所有新專案啟動與交付檢查清單 |
