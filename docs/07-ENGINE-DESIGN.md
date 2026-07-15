# Engine Design

所有 Engine 以單一責任、穩定契約、獨立測試與可替換實作為共同原則。

| Engine | 一句介紹 |
| --- | --- |
| Identity Center | 統一平台身份及外部登入提供者的映射。 |
| Tenant Manager | 管理租戶生命週期、邊界與租戶層設定。 |
| CRM Engine | 管理跨通路的成員關係、互動與標籤。 |
| Point Engine | 管理可追溯的點數帳本、異動與餘額。 |
| Referral Engine | 管理推薦人、被推薦人、分享識別與推薦事件。 |
| Attribution Engine | 判定通路、來源、活動與轉換的歸因關係。 |
| Content Engine | 管理內容、版本、語系與發布狀態。 |
| Event Engine | 管理活動、報名、參與及簽到生命週期。 |
| Document Engine | 管理文件資產、版本、狀態與處理流程。 |
| OCR Engine | 將影像或文件轉為帶有信心資訊的結構化結果。 |
| Notification Engine | 統一編排跨通路通知、樣板與發送結果。 |
| Media Engine | 管理媒體儲存、轉換、中繼資料與存取控制。 |
| AI Engine | 管理模型、Prompt、工具、政策、成本與可觀測性。 |
| Permission Engine | 依主體、角色、資源與範圍執行授權決策。 |
| Setting Engine | 管理平台到模組各層級設定的繼承與覆寫。 |
| API Gateway | 提供統一的驗證、路由、版本、限流與 API 觀測入口。 |

## Engine 共通契約

- 每個 Engine 必須公開版本化介面，不公開內部資料結構。
- 每個 Engine 必須定義身份、Tenant Scope 與 Permission 要求。
- 跨 Engine 寫入不得直接操作對方資料。
- 非同步協作需定義事件版本、冪等鍵、重試與失敗處理。
- Engine 可被 Project 組合，但不得包含客戶專屬流程。
