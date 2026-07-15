# Feature Asset Map

## 文件目的

本文件只盤點目前已知的功能資產來源，作為未來分析與模組化候選清單。列入來源不代表程式已匯入、已驗證、可直接重用或已符合 Platform Core 標準。

## 已知資產

| 能力 | 已知來源 | Framework 對應候選 | 目前狀態 |
| --- | --- | --- | --- |
| CRM | Action | CRM Engine | 待分析與去專案化 |
| 商城 | Hooktea | Commerce Module（候選） | 待分析與定義邊界 |
| LINE Rich Menu | 好櫻花福委會 | Channel Adapter（候選） | 待分析與去品牌化 |
| 電子名片 | 小系統 V0～V5 | Digital Card Module（候選） | 待比較版本與整理需求 |
| OCR 名片掃描 | LINE 專案 | OCR Engine / Contact Adapter（候選） | 待分析與驗證 |
| 旅遊 OCR 文件解析 | TravelKeeper | Document Engine / OCR Engine | 待分析與去領域化 |
| 活動管理 | TDA | Event Engine | 待分析與驗證 |
| 活動簽到 | K-Link | Event Check-in Module（候選） | 待分析與驗證 |
| 旅遊 Flex 推薦 | TravelKeeper | Content / Recommendation Module（候選） | 待拆分通路與領域責任 |
| 推薦分享 | TravelKeeper | Referral Engine | 待分析與驗證 |

## 資產進入 Core 的條件

1. 完成功能行為與依賴盤點。
2. 移除客戶、品牌、租戶與專案專屬假設。
3. 定義清楚的輸入、輸出、錯誤與權限契約。
4. 證明可獨立測試，且不依賴來源專案的內部狀態。
5. 至少在兩個獨立情境完成驗證後，才評估提升為共用核心模組。
6. 在完成上述程序前，一律標示為候選或實驗性資產。

## 本 Sprint 限制

本次不讀取、不複製、不改寫任何來源專案程式，只建立資產索引。
