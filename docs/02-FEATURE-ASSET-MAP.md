# Feature Asset Map

## 文件目的

本文件只盤點已知功能資產來源與初步候選分類。列入清單不代表程式已匯入、已驗證、可重用、已完成 Domain Module 化，或已獲 `Stable`／`Core Approved`。

## 已知資產

| 功能 | Source Project | Candidate Type | Current Maturity | Cross-project Reuse Potential | Known Risk | Required Audit | Promotion Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CRM | Action | CRM Module Candidate | Candidate | 中高，未驗證 | 客戶欄位、資料耦合與權限邊界未知 | 行為、資料、Permission、通道依賴 | Not Approved |
| 商城 | Hooktea | Commerce Module Candidate | Candidate | 中，未驗證 | 商品、訂單、付款與 Tenant 規則可能耦合 | Domain Boundary、交易與外部 API | Not Approved |
| LINE Rich Menu | 好櫻花福委會 | LINE Adapter／Content Module Candidate | Candidate | 中，未驗證 | LINE OA、品牌與內容格式耦合 | 通道格式、Configuration 與內容擁有權 | Not Approved |
| 電子名片 | 小系統 V0–V5 | Business Card Module Candidate | Candidate | 中高，未驗證 | 多版本差異、客戶欄位與 UI 耦合 | 版本比較、資料模型與公開 Interface | Not Approved |
| OCR 名片數位化 | LINE 專案 | OCR／Business Card Workflow Candidate | Candidate | 中高，未驗證 | OCR Provider、個資與人工校正流程 | 敏感資料、Provider、錯誤與 Test Plan | Not Approved |
| 旅遊文件解析 | TravelKeeper | Document Module／Travel Extension Candidate | Candidate | 中，未驗證 | 旅遊領域格式與 OCR 邏輯混合 | 共用解析能力、Travel Extension 與資料保留 | Not Approved |
| 活動管理 | TDA | Event Module Candidate | Candidate | 中高，未驗證 | 活動規則、角色與資料範圍未知 | 生命週期、Permission、Domain Event | Not Approved |
| 活動簽到 | K-Link | Attendance Module＋Location Policy Candidate | Candidate | 中，未驗證 | 定位個資、現場例外與重複簽到 | Location Policy、Idempotency、Audit Log | Not Approved |
| Flex 推薦內容組合 | TravelKeeper | Content Collection Module Candidate | Candidate | 中，未驗證 | LINE Flex 與旅遊推薦邏輯耦合 | Content Model、排序 Strategy、通道無關性 | Not Approved |
| 推薦與交易歸因 | TravelKeeper | Referral／Attribution Module Candidate | Candidate | 中高，未驗證 | 推薦、交易、Point 與歸因規則混合 | 關係、交易邊界、歸因 Policy、Idempotency | Not Approved |

## Maturity 與 Promotion Status

- `Current Maturity` 使用 [Module Lifecycle](11-MODULE-LIFECYCLE.md) 的階段。
- 本清單項目目前一律不高於 `Candidate`。
- `Promotion Status: Not Approved` 表示尚未獲准進入 Experimental、Stable 或 Platform Core。
- Cross-project Reuse Potential 只是初步假設，必須由不同場景的證據驗證。

## 必要程序

每個候選項目必須：

1. 依 [Legacy Asset Extraction](17-LEGACY-ASSET-EXTRACTION.md) 完成 Read-only Audit。
2. 依 [Module Promotion Standard](14-MODULE-PROMOTION-STANDARD.md) 回答 20 項問題並評分。
3. 移除客戶、品牌、Tenant、通道與專案專屬假設。
4. 定義公開 Interface、Owned Data、Permission、Configuration 與 Extension Points。
5. 建立 Security、Test Plan、Audit Log、Idempotency、版本與回滾方式。
6. 依生命週期逐階段晉升；不得跳過 Experimental 或跨專案驗證。

## 本階段限制

本文件不讀取、不複製、不改寫任何來源專案程式，也不代表對來源 Repository、Branch、Commit 或正式環境完成稽核。
