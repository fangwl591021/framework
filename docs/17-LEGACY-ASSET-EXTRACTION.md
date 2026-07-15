# Legacy Asset Extraction

## 原則

舊專案功能只能作為分析來源，不是 Framework 可直接搬移的程式庫。每次萃取都必須從 Read-only Audit 開始，確認來源 Branch／Commit 與現況行為後，才可提出抽象設計。

## 標準流程

```text
Inventory
→ Read-only Audit
→ Select Candidate
→ Document Current Behavior
→ Identify Customer-Specific Logic
→ Identify Shared Capability
→ Define Interface
→ Define Data Boundary
→ Define Configuration
→ Define Extension Points
→ Security Review
→ Test Plan
→ Experimental Module
→ Cross-Project Validation
→ Stable Module
```

任何階段發現資料邊界不清、客戶耦合過高、Security 風險或缺乏重用價值，都可以停止並分類為 `Keep in Project`、`Extension Candidate`、`Needs Refactor` 或 `Reject`。

## 必要產出

每次評估需建立一份不含來源程式與敏感資料的紀錄：

| 欄位 | 說明 |
| --- | --- |
| Source Repository | 來源 Repository 名稱或受控識別 |
| Source Branch／Commit | 已驗證的來源版本 |
| 功能名稱 | 使用者可辨識的能力 |
| 目前使用場景 | 實際入口、角色與流程 |
| 做得好的部分 | 有證據的可保留行為 |
| 已知問題 | 缺陷、限制與未驗證項目 |
| Technical Debt | 大型檔案、耦合、測試或營運問題 |
| 資料表依賴 | 只記錄結構性依賴，不複製正式資料 |
| 外部 API 依賴 | Provider、通道與錯誤特性 |
| 客戶專屬內容 | 名稱、流程、規則與欄位 |
| 敏感資料 | 個資、Secret、Token 與法規風險 |
| Permission 模型 | 主體、動作、資源與 Tenant Scope |
| 可抽象能力 | 可成為 Interface、Configuration 或 Domain Event 的部分 |
| 建議歸類 | Project、Extension、Domain Module 或 Platform Core 候選 |
| 重構成本 | 1–5 與估算依據 |
| 是否適合進 Framework | 結論與必要前置條件 |

## Read-only Audit 規則

- 先驗證 Repository、Branch、Commit 與實際執行表面。
- 不修改來源 Repository、不部署、不寫入正式資料。
- 不使用檔名或單一函式推測完整架構。
- 不複製程式、Schema、Secret、客戶資料或正式設定。
- 分別標記「已觀察行為」、「推論」與「尚未驗證」。
- Audit 完成後只產出候選設計，不得直接宣稱模組化完成。

## 目前待評估案例

| 功能 | Source Project | 初步定位 |
| --- | --- | --- |
| CRM | Action | Module Candidate |
| 商城 | Hooktea | Module Candidate |
| LINE Rich Menu | 好櫻花福委會 | LINE Adapter／Content Module Candidate |
| 電子名片 | 小系統 V0–V5 | Business Card Module Candidate |
| OCR 名片數位化 | LINE 專案 | OCR／Business Card Workflow Candidate |
| 旅遊文件解析 | TravelKeeper | Document Module／Travel Extension Candidate |
| 活動管理 | TDA | Event Module Candidate |
| 活動簽到 | K-Link | Attendance Module＋Location Policy Candidate |
| Flex 推薦內容組合 | TravelKeeper | Content Collection Module Candidate |
| 推薦與交易歸因 | TravelKeeper | Referral／Attribution Module Candidate |

以上全部為初步分類，Current Maturity 一律不高於 `Candidate`，尚未獲得 `Stable` 或 `Core Approved`。

## 萃取完成條件

- 已建立與來源專案無關的責任、Interface 與資料邊界。
- 客戶差異已分配至 Configuration、Policy／Strategy 或 Extension。
- 已完成 Tenant Safety、Security、Permission、Audit Log 與 Idempotency 檢查。
- 已建立獨立 Test Plan、版本與回滾方式。
- 進入 Experimental 後仍需跨專案驗證，才可依生命週期評估 Stable。
