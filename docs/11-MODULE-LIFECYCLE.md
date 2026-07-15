# Module Lifecycle

## 生命週期

```text
Idea
→ Candidate
→ Extracting
→ Experimental
→ Stable
→ Core Approved
→ Deprecated
→ Retired
```

`Stable` Domain Module 不必繼續晉升為 Platform Core。`Core Approved` 只適用於真正的底層共用能力，不是所有成熟 Module 的終點。

## 階段規則

| 階段 | 定義 | 正式專案使用 | 測試 | 版本 | 破壞性修改 | 晉升批准 | 問題處理／退回 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Idea | 尚未形成邊界的需求或觀察 | 不可 | 僅需探索證據 | 無 | 允許 | 提案人可建立 | 關閉或保留於待辦 |
| Candidate | 舊專案中看似可重用，但尚未證明跨專案價值 | 不可視為 Framework 能力 | 需記錄現況與風險 | 無正式版本 | 允許 | Module Owner 與 Architecture Reviewer | 退回 Idea 或 Keep in Project |
| Extracting | 正在唯讀稽核、去除客戶邏輯並設計邊界 | 不可 | 必須建立現況測試與 Test Plan | 可用 `0.0.x` 草案標記 | 允許，但需記錄 | Module Owner | 退回 Candidate，不得把半成品留作正式依賴 |
| Experimental | 已有獨立設計，可在測試專案或限定 Tenant 試用 | 僅限明確核准範圍 | 必須有單元、契約及 Tenant Boundary 測試 | `0.x.y` | 允許，但需發布說明與遷移指引 | Module Owner、Architecture Reviewer、試用專案 Owner | 停用 Feature Flag，退回 Extracting 或上一個可用版本 |
| Stable | 至少通過兩個不同場景或專案驗證，契約與營運責任清楚 | 可以 | 必須維持回歸、安全、權限及營運測試 | `1.0.0` 以上 | 只能透過 MAJOR 版本 | Module Owner 與 Repository Maintainer | 回滾版本；重大缺陷可降回 Experimental |
| Core Approved | 經證明為跨模組、跨專案且不可替代的底層能力 | 可以 | 必須具最高層級契約、相容性、安全及遷移驗證 | `1.0.0` 以上 | 僅限 ADR、MAJOR 版本及遷移計畫 | Architecture Owner 與 Repository Maintainer | 立即停止推廣、回滾版本，必要時降回 Stable Module |
| Deprecated | 已公告替代方案與停止支援時間 | 僅供既有使用者遷移 | 維持安全與遷移所需測試 | 保留既有版本線 | 不新增破壞性功能 | Module Owner 與 Repository Maintainer | 可撤回棄用，或延長遷移期限 |
| Retired | 已停止支援且不得再被新專案依賴 | 不可 | 只保留歷史證據 | 封存 | 禁止 | Repository Maintainer | 若需恢復，必須重新從 Candidate 評估 |

## 晉升證據

每次晉升必須包含：

- 目前階段與目標階段
- 功能責任與資料邊界
- 使用專案與驗證場景
- 測試及未測試項目
- Tenant Safety、Security、Idempotency 與 Audit Log 證據
- 版本、相容性、回滾與營運計畫
- 已知風險與批准紀錄

不得因「很多專案都有」就直接進入 Platform Core，也不得把使用次數等同於跨專案驗證。

## 降級與回滾

發生資料隔離、安全、契約不相容或重大營運問題時，應先停用 Feature Flag 或回滾至上一個可用版本，再由批准該階段的相同角色決定降級。所有降級都需記錄原因、影響範圍、修復條件與重新晉升所需證據。

## 治理角色

- **Module Owner**：維護責任、版本、測試與營運證據。
- **Architecture Reviewer**：檢查分層、依賴、資料與擴充邊界。
- **Repository Maintainer**：守護分支、發布與 Repository 穩定性。
- **Architecture Owner**：批准 `Core Approved`；實際人選仍需團隊正式指定。
