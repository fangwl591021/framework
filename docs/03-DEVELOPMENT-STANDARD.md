# Development Standard

## 基本原則

### 禁止超大型單一 Worker

不得把 Route、SQL、商業規則、外部 API、排程、Webhook 與畫面格式集中在單一大型 Worker 或單一檔案。部署單位可以先整合多個 Domain Module，但原始碼責任、公開 Interface 與 private 實作必須分離。

### 優先建立模組化單體

初期可以採一個 Worker 部署單位，但應先建立清楚的模組化單體。只有安全、流量、部署週期或故障隔離需求明確出現時，才評估拆成多 Worker；不得為了微服務而過早微服務化。

### 主入口保持薄層

主入口只負責：

- 啟動 Application
- 掛載 Route
- 組合依賴與 Adapter
- 設定全域中介層與錯誤處理

主入口不得承載 SQL、領域計算、客戶判斷、外部格式轉換或畫面組裝。

### 所有功能必須模組化

每個 Domain Module 必須有單一責任、公開 Interface、private 邊界、明確依賴與 Owned Data。Extension、Adapter 與 Platform Core 亦須遵守各自分層責任。

### 所有功能可獨立測試

模組必須能以受控輸入驗證輸出、錯誤、Permission、Tenant Boundary 與 Domain Event，不要求整個 Application 同時啟動才能測試。

### Domain Module 必須解耦

Domain Module 間只能透過版本化 Interface、Service Contract、Command、Query、Domain Event 或 Queue 協作。禁止直接查詢或更新其他 Domain Module 的資料表、Import private function 或共享無邊界的大型 Service。

### 所有 API 可重用

API 契約不得綁定單一頁面、客戶或通道。輸入輸出需一致、可版本化、可觀測，並具明確 Platform User、Tenant Context 與 Permission Scope。

### 禁止 Copy/Paste 開發

不得以複製舊專案功能建立新 Application。值得共用的能力必須先完成 Read-only Audit、邊界設計與 Module Lifecycle。

## 檔案責任與審查門檻

行數是架構警示，不是唯一判斷標準：

- **超過約 500 行**：Reviewer 必須確認仍為單一責任，並記錄判斷。
- **超過約 1,000 行**：原則上必須提出拆分理由或具 Owner、期限的重構計畫。
- **超過約 2,000 行**：除自動生成內容外，不得直接合併。

超過合理範圍時，必須分析責任、依賴、資料擁有權、測試難度與變更風險。不得為追求小檔案而產生只轉呼叫、無清楚邊界或使閱讀更困難的碎片化。

## Framework 邊界

- **Platform Core**：底層共用能力、契約與政策。
- **Domain Module**：可組合的領域能力與 Owned Data。
- **Adapter**：外部供應商或通道的驗證與格式轉換。
- **Extension**：特定客戶或產業流程，只使用正式 Extension Points。
- **Application／Tenant Configuration**：組合能力並表達 Tenant 差異。

詳細規則見 [Framework Layers](10-FRAMEWORK-LAYERS.md) 與 [Configuration and Extension Rules](16-CONFIGURATION-EXTENSION-RULES.md)。

## API 與協作標準

- 明確指定版本、認證、Tenant Context 與 Permission Scope。
- 使用一致的成功、錯誤、分頁與追蹤識別格式。
- 寫入操作需定義 Idempotency、重試與 Audit Log。
- 破壞性變更必須建立 MAJOR 版本、ADR 與遷移計畫。
- 不得在回應或 Domain Event 洩露其他 Tenant 或 private 實作細節。
- Domain Module 只能依賴其他模組的公開且版本化契約。

## 品質與變更標準

- 先定義責任、資料邊界、Interface 與驗收條件，再實作。
- 每次變更保持單一目的，不夾帶不相關重構。
- 新增依賴前說明必要性、風險與替代方案。
- 依風險建立單元、契約、Tenant Boundary、安全或整合測試。
- 日誌不得包含密碼、Token、完整個資或跨 Tenant 資料。
- 文件、版本、Interface、Domain Event 與實作必須同步。
- `main` 只接受經 Branch／Pull Request 審查且驗證通過的變更。
