# Configuration and Extension Rules

## 判斷原則

客戶差異依序評估 Configuration、Policy／Strategy、Extension。只有跨產業且不可由這些方式表達的底層能力，才可能進入 Platform Core。

## 優先使用 Configuration

Configuration 適用於有限、可驗證、無需改變演算法結構的參數或開關，例如：

- 贈點數值、推薦有效期限、活動時間
- 是否限制地點、是否允許重複簽到
- 登入 Provider 與 Domain Module 開關
- 語系、Flex 樣式、通知時間
- 審核是否必要、歸因模式、單層推薦規則

Configuration 必須有名稱、型別、預設值、允許範圍、作用層級、變更權限與 Audit Log；不得接受任意程式碼或未驗證內容。

## 使用 Policy／Strategy

當差異需要替換一套可明確命名、具有相同契約的判斷或計算方法時，使用 Policy 或 Strategy：

- 不同點數計算公式
- 不同推薦歸屬方式
- 不同簽到驗證 Strategy
- 不同內容排序 Strategy
- 不同會員升級條件
- 不同價格或佣金計算方式

Policy／Strategy 必須實作相同公開契約，可獨立測試，且不得直接存取其他 Domain Module 的私有資料。

## 使用 Extension

下列完整特殊流程使用 Extension：

- 特定客戶的完整特殊流程
- 特定產業的額外審核
- 特定企業的特殊 API
- 非共通業務工作流
- 無法只以 Configuration、Policy 或 Strategy 表達的客製需求

Extension 必須透過 Hook、Domain Event、Policy、Strategy、Plugin Interface 或 Configuration 與 Framework 互動，並有獨立版本、Feature Flag、Tenant Scope、測試與回滾方式。

## 判斷流程

1. 只是數值、時間、開關、樣式或有限選項嗎？使用 Configuration。
2. 是同一責任下可替換的算法或判斷嗎？使用 Policy／Strategy。
3. 是特定客戶或產業的完整流程嗎？使用 Extension。
4. 能在多個 Application 中獨立安裝且具有自己的資料邊界嗎？評估 Domain Module。
5. 是否為跨模組不可替代的底層能力？經 ADR 後才評估 Platform Core。

## 禁止事項

- 在 Platform Core 中寫入 `if tenant_id === ...` 類型判斷。
- 以客戶名稱作為程式或資料路由條件。
- Fork 整個 Framework 形成客戶專屬版本。
- 每個客戶複製一份相同 Domain Module。
- 為單一客戶需求修改所有 Tenant 的預設行為。
- 將可設定的差異硬編碼在 Route、Adapter 或畫面格式中。
- 讓 Extension 直接 Import Platform Core 或 Domain Module 的 private function。

## 變更治理

- 新增 Configuration Key 需說明層級、預設值、相容性與安全影響。
- 新增 Policy／Strategy 需列出契約、選用方式與失敗 fallback。
- 新增 Extension 需建立 Owner、支援範圍、Feature Flag、測試與停用計畫。
- 若相同 Extension 在不同場景重複出現，先進入 Module Promotion 評估，不得直接搬入 Platform Core。
