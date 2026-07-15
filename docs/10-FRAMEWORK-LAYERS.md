# Framework 五層架構

## 目的

本文件正式定義 Platform Core Framework 的責任分層。依賴只能朝較穩定、較通用的抽象前進；客戶、產業與通道差異不得向下污染 Platform Core。

## 五層依賴圖

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

箭頭表示主要依賴方向，不等同執行時的實際呼叫方向。例如 Platform Core 可透過抽象介面呼叫 Adapter，但 Platform Core 不得依賴特定 LINE 或 AI 供應商實作。外部事件也可由 Adapter 向上送入 Domain Module；Adapter 只能驗證、轉換與傳遞外部格式，不得反向承載點數、推薦、會員或其他商業規則。

## 1. Platform Core

Platform Core 只包含跨產業、跨 Tenant、跨通道都需要，且難以由上層替代的基礎能力與規範。

### 候選內容

- Identity Center
- Tenant Manager
- Permission Engine
- Setting Engine
- Audit Log
- Transaction Boundary
- Event Bus 與 Domain Event 規範
- API Gateway 規範
- Module Registry
- Feature Flag
- Security Policy
- Observability
- Idempotency
- Common Error Model

以上是候選清單，不代表已完成實作或已獲 `Core Approved`。

### 不得包含

- 特定客戶名稱或客戶識別判斷
- 特定商品、活動、分潤或贈點規則
- 特定 LINE OA、Rich Menu 或 LIFF 設定
- 特定產業頁面與畫面格式
- 特定客戶資料欄位

## 2. Domain Module

Domain Module 是可獨立啟用、停用、安裝、版本化與組合的領域能力。

### 目前候選

- CRM Module
- Member Module
- Point Module
- Referral Module
- Attribution Module
- Event Module
- Attendance Module
- Coupon Module
- Commerce Module
- Business Card Module
- OCR Module
- Document Module
- Content Collection Module
- Notification Module
- Merchant Redemption Module

### 必要條件

- 有清楚且單一的責任。
- 有自己的資料邊界與資料擁有權。
- 有公開 API 或 Service Interface，並區分 private 實作。
- 可獨立測試與版本化。
- 可由 Feature Flag 啟用或停用。
- 不直接讀寫其他 Domain Module 的內部資料表。
- 不依賴特定前端或訊息通道。

## 3. Adapter

Adapter 專門隔離外部平台、通道與技術供應商的格式及協定差異。

### 候選 Adapter

- LINE Messaging Adapter、LINE Login Adapter、LIFF Adapter
- WhatsApp Adapter、WeChat Adapter
- Google Login Adapter、Apple Login Adapter、Facebook Login Adapter
- Email Adapter、SMS Adapter、Payment Adapter
- Image Provider Adapter、OCR Provider Adapter、AI Provider Adapter
- Storage Adapter

Adapter 可以驗證外部簽章、轉換資料格式、處理供應商錯誤並呼叫公開介面；不得決定點數、推薦、會員等級、優惠或其他核心商業規則。

## 4. Extension

Extension 用於特定客戶或產業的特殊行為，例如 K-Link 活動現場定位驗證、TravelKeeper 行程推薦格式、特定會員等級、企業審核流程或活動贈點方式。

Extension 不得修改 Platform Core 私有實作，必須透過下列正式擴充點互動：

- Hook
- Domain Event
- Policy
- Strategy
- Plugin Interface
- Configuration

Extension 必須被明確命名、版本化、測試並限制 Tenant Scope；移除 Extension 不得破壞其他 Tenant。

## 5. Application／Tenant Configuration

Application 負責組合 Platform Core、Domain Module、Adapter 與 Extension。Tenant Configuration 負責表達租戶差異。

設定內容包括：

- 啟用的 Domain Module 與登入 Provider
- 加好友或打卡贈點數值
- 推薦有效期限與歸因模式
- 是否啟用地點驗證
- 品牌、語系、Flex 樣式與 Rich Menu 設定

這些差異原則上應保存為 Configuration，不得為每個 Tenant 複製或修改 Framework 程式。

## 分層判斷順序

1. 能否只用 Tenant Configuration 表達？
2. 是否可由既有 Policy 或 Strategy 表達差異？
3. 是否屬於單一客戶或產業的 Extension？
4. 是否是可跨專案重用的 Domain Module？
5. 只有真正跨模組、跨專案且不可替代的底層能力，才評估進入 Platform Core。
