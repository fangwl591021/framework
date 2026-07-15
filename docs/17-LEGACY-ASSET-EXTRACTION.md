# Legacy Asset Extraction

## 原則

舊 Application 只能作為 `Candidate Source`，不得在稽核前指定為「最佳實作」或完整基底。每次萃取必須從 Read-only Audit 開始，確認 Source Repository、Branch、Commit 與實際行為後，才提出抽象設計。

同一 Domain Module 可以從多個 Candidate Source 取長補短；不得直接選一個 Repository 複製成 Framework Module。

## 標準流程

```text
Inventory
→ Read-only Audit
→ Select Candidate Sources
→ Document Current Behavior
→ Compare with Module Contract
→ Gap Analysis
→ Identify Customer-Specific Logic
→ Identify Shared Capability
→ Define Public Interface and Owned Data
→ Define Configuration and Extension Points
→ Security Review
→ Test Plan
→ Experimental Module
→ Cross-Project Validation
→ Stable Module
```

發現 Data Boundary 不清、客戶耦合過高、Security Risk 或缺乏重用價值時，可停止並分類為 `Keep in Project`、`Extension Candidate`、`Needs Refactor` 或 `Reject`。

## Candidate Source Record

每個來源都需記錄：

| 欄位 | 說明 |
| --- | --- |
| Source Repository | Candidate Source 名稱或受控識別 |
| Source Branch／Commit | 已驗證來源版本 |
| 功能名稱與使用場景 | 實際入口、角色與流程 |
| 做得好的部分 | 有證據的可保留行為，不使用「最佳」字樣 |
| 已知問題／Technical Debt | 缺陷、耦合、測試與營運限制 |
| Owned Data Candidate | 目前直接建立或修改的資料概念 |
| External Data／API | 其他 Module、Provider 與 Channel 依賴 |
| 客戶專屬內容 | 名稱、流程、規則與欄位 |
| Sensitive Data | PII、Secret、Token 與法規風險 |
| Permission Model | Actor、Action、Resource、Tenant／Brand／Shop Scope |
| Reusable Capability | 可抽象成 Interface、Configuration、Policy 或 Domain Event 的部分 |
| Recommended Classification | Project、Extension、Domain Module、Platform Core Candidate |
| Extraction Cost | 1–5 與依據 |
| Framework Suitability | 結論與前置條件 |

## Multi-source Comparison

每個 Candidate Source 必須使用同一份 [Module Contract Template](templates/MODULE-CONTRACT-TEMPLATE.md) 比較，不能用來源專案自己的檔案結構作共同標準。

| Contract Area | Source A | Source B | Target Contract | Gap／Decision |
| --- | --- | --- | --- | --- |
| Purpose／Capability | | | | |
| Public Interface | | | | |
| Owned Data | | | | |
| Tenant／Shop Boundary | | | | |
| Commands／Queries／Events | | | | |
| Configuration／Extension | | | | |
| Security／PII | | | | |
| Idempotency／Audit | | | | |
| Testing／Operations | | | | |

## Gap Analysis

Gap Analysis 必須記錄：

- Target Module Contract 已具備但來源缺少的能力
- 來源具備但不應進 Framework 的客戶或 Channel 邏輯
- 不同來源互相衝突的行為與採用理由
- 需要新增的 Tenant、Brand、Shop、Permission、Audit 或 Idempotency Control
- Migration、Backward Compatibility、Test Plan 與 Rollback 缺口
- 未驗證假設與 Architecture Owner 決策需求

## Provenance

任何被保留的行為或設計都需記錄：

- Candidate Source
- Branch／Commit
- 來源行為與證據位置
- 萃取後歸屬：Platform Core、Domain Module、Adapter、Extension 或 Configuration
- 是否已取得必要授權與 Security Review

Provenance 只記錄設計證據，不把來源程式、Secret 或正式資料複製到 Framework。

## Read-only Audit Rules

- 驗證 Repository、Branch、Commit、Runtime Surface 與資料目標。
- 不修改 Candidate Source、不部署、不寫入 Production Data。
- 不以檔名、單一函式或單一成功案例推測完整架構。
- 不複製程式、Schema、Secret、UID、PII、客戶資料或正式設定。
- 分別標記 Observed、Inferred、Not Verified。
- Audit 完成後只產出 Candidate Design，不宣稱 Module 已完成。

## Current Candidate Sources

| 功能 | Candidate Source | 初步定位 |
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

以上全部為初步分類，Current Maturity 不高於 `Candidate`，尚未 Stable、Core Approved、Implemented 或 Production Verified。

## Extraction Completion Gate

- Module Contract、Registry Entry、Gap Analysis 與 Provenance 完整。
- 客戶差異已分配至 Configuration、Policy／Strategy 或 Extension。
- 已完成 Tenant Safety、Security、Permission、PII、Audit 與 Idempotency Review。
- 已建立 Testing、Version、Migration、Backward Compatibility 與 Rollback。
- Experimental 之後仍需兩個實質差異正式場景，才可由 Tony 評估 Stable。
