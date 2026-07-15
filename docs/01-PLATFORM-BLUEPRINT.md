# Platform Blueprint

## 高層架構

Platform Core 以「入口層、治理層、領域引擎層、平台服務層」劃分責任。每個模組透過明確 API 或事件契約協作，不直接讀寫其他模組的內部資料。

```text
Web / App / LINE / WhatsApp / WeChat / Partner Systems
                         |
                    API Gateway
                         |
       Identity Center + Permission Engine
                         |
                    Tenant Manager
                         |
 ---------------------------------------------------------
 | CRM | Point | Referral | Attribution | Content | Event |
 | Document | OCR | Notification | Media | AI | Setting   |
 ---------------------------------------------------------
                         |
        Cloudflare Platform Services and Data Services
```

## 核心能力

### Identity Center

管理平台身份、外部登入提供者與不同租戶或商店成員身份之間的映射。

### Tenant Manager

管理租戶生命週期、租戶邊界、租戶狀態與租戶層級設定。

### CRM Engine

管理可跨通路使用的成員關係、互動紀錄與標籤能力。

### Point Engine

管理點數帳本、異動規則、餘額計算與可追溯性。

### Referral Engine

管理推薦關係、分享識別與推薦事件，不直接承擔獎勵計算。

### Attribution Engine

判定來源、活動、通路與轉換之間的歸因關係。

### Content Engine

管理可重用內容、內容版本、發布狀態與多語系內容。

### Event Engine

管理活動定義、參與、報名、簽到與活動生命週期。

### Document Engine

管理文件上傳後的生命週期、狀態、版本與處理工作。

### OCR Engine

提供影像或文件文字辨識、結構化結果與信心資訊。

### Notification Engine

統一管理跨通路通知意圖、樣板、發送狀態與結果。

### Media Engine

管理圖片、影片與其他媒體資產的儲存、轉換、中繼資料與存取政策。

### AI Engine

統一管理模型能力、Prompt、工具、輸入輸出政策與可觀測性。

### Permission Engine

依平台、租戶、組織與資源範圍執行授權判斷。

### Setting Engine

管理平台、租戶、商店與模組層級的設定，並定義繼承與覆寫順序。

### API Gateway

作為所有外部與內部 API 的統一入口，負責驗證、路由、版本、流量控制與觀測。

## 架構邊界

- Engine 只擁有自己的領域責任與資料規則。
- 跨 Engine 流程透過 API、事件或工作佇列協調。
- Identity、Tenant 與 Permission 是所有模組的共同治理基礎。
- 通路整合不得直接繞過 API Gateway 存取 Engine 內部。
- 專案層負責組合模組與客製流程，Core 不內建客戶專屬行為。
