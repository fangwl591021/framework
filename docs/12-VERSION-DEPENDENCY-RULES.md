# Version and Dependency Rules

## Semantic Versioning

Framework 與可發布的 Domain Module 使用：

```text
MAJOR.MINOR.PATCH
```

- **MAJOR**：破壞相容性的介面、資料語意或行為修改。
- **MINOR**：向下相容的新能力、公開介面或選用設定。
- **PATCH**：向下相容的錯誤、安全或文件修正。

Experimental Module 使用 `0.x.y`；進入 Stable 時才發布 `1.0.0`。版本號描述契約相容性，不代表模組成熟度，成熟度仍以 [Module Lifecycle](11-MODULE-LIFECYCLE.md) 為準。

## 依賴方向

### 允許

```text
Application → Extension → Domain Module → Platform Core
Adapter → Platform Core Interface
Domain Module → Platform Core Interface
```

Application 負責依賴組合；Platform Core 只能認識抽象契約，不能認識客戶、通道或供應商實作。

### 禁止

```text
Platform Core → 客戶專屬 Extension
Platform Core → 特定 LINE Adapter
Domain Module A → 直接操作 Domain Module B 的資料表
Adapter → 決定點數或推薦規則
客戶 Application → 直接修改 Platform Core 原始碼
```

## Domain Module 間協作

只能透過：

- 公開 Interface
- Service Contract
- Domain Event
- Queue
- Command
- Query Interface

不得透過：

- 直接查詢或更新其他 Domain Module 的內部資料表
- Import 其他 Domain Module 的 private function
- 複製其他 Domain Module 的商業邏輯
- 共用沒有責任邊界的大型 Service

同步協作需定義 timeout、錯誤與相容性；非同步協作需定義 Domain Event 版本、Idempotency、重試、順序與死信處理。

## 依賴宣告與鎖定

- Application 必須記錄使用的 Platform Core、Domain Module、Adapter 與 Extension 版本。
- 依賴範圍不得自動跨越 MAJOR 版本。
- 升級前需閱讀變更紀錄並執行契約及回歸驗證。
- Domain Module 不得依賴另一模組未公開、未版本化的行為。
- 破壞性變更需附 ADR、遷移方式、回滾方式與棄用期限。

## Cloudflare 部署考量

- 初期不必拆成大量 Worker，可以先維持一個部署單位。
- 即使同一部署單位，原始碼仍必須依 Platform Core、Domain Module、Adapter 與 Extension 分離。
- 主入口只負責啟動、路由掛載與依賴組合。
- 當安全邊界、流量特性、部署週期或故障隔離需求明確出現時，再評估拆成多 Worker。
- 不應為了微服務而過早微服務化。
- 不應因單一 Worker 部署方便，就把 Route、SQL、商業規則、供應商 API 與畫面格式寫在同一檔案。

## 相容性最低要求

- 公開介面、Configuration Key、Domain Event 與錯誤模型均屬版本契約。
- PATCH 與 MINOR 不得讓既有呼叫方必須同步修改。
- MAJOR 發布前必須提供影響清單、遷移驗證與回滾門檻。
- 跨 Tenant 的資料語意或 Permission Scope 變更一律視為高風險，不得僅以 PATCH 發布。
