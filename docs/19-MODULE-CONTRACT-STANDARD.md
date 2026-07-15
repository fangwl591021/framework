# Module Contract Standard

## 目的

每個 Domain Module 在進入 `Experimental` 前必須具備可審查的 Module Contract。Contract 定義責任、公開依賴、資料邊界、Tenant Scope、安全與生命週期，不代表 API 或程式已建立。

## 必要欄位

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| Module Name | 是 | 人類可讀名稱 |
| Module ID | 是 | 穩定、唯一、機器可辨識的 kebab-case 識別 |
| Purpose | 是 | 存在原因與非目標 |
| Business Capability | 是 | 提供的領域能力 |
| Lifecycle Status | 是 | Module Lifecycle 階段 |
| Owner | 是 | Module Owner；未指定不得進入 Experimental |
| Version | 是 | Semantic Versioning 或草案版本 |
| Dependencies | 是 | Platform Core 與 Domain Module 公開依賴 |
| Public Interfaces | 是 | 其他模組唯一可依賴的能力 |
| Commands | 是 | 要求改變狀態的動作；無則填 None |
| Queries | 是 | 不改變狀態的查詢；無則填 None |
| Domain Events Published | 是 | 已發生事實；無則填 None |
| Domain Events Consumed | 是 | 訂閱的已發生事實；無則填 None |
| Owned Data | 是 | 可直接建立、修改、刪除的資料概念 |
| Read-only External Data | 是 | 經公開 Query Interface 取得的其他 Module 資料 |
| Configuration | 是 | 參數、預設值、Scope 與驗證 |
| Policies | 是 | 可替換決策規則 |
| Strategies | 是 | 可替換演算法或流程策略 |
| Feature Flags | 是 | 啟用、試用與緊急停用方式 |
| Permissions | 是 | 主體、動作、資源與 Scope |
| Tenant Boundary | 是 | Tenant 隔離規則 |
| Shop Boundary | 是 | Brand／Shop Scope；不適用需說明 |
| Idempotency Requirements | 是 | Key、Scope、Expiration 與衝突行為 |
| Audit Requirements | 是 | 必須記錄的敏感或重要操作 |
| Error Model | 是 | 公開錯誤分類與敏感資訊限制 |
| Retry Policy | 是 | 可重試條件、次數、退避與死信 |
| Security Classification | 是 | Public、Internal、Confidential 或 Restricted |
| PII Handling | 是 | 收集、遮罩、保留、刪除與存取政策 |
| Adapter Dependencies | 是 | 外部 Provider Adapter 依賴；無則填 None |
| Extension Points | 是 | Hook、Policy、Strategy 或 Plugin Interface |
| Observability | 是 | Metric、Trace、Log 與告警責任 |
| Testing Requirements | 是 | 單元、Contract、Tenant Boundary、安全與營運測試 |
| Migration Requirements | 是 | 資料或契約 Migration；無則填 None |
| Backward Compatibility | 是 | 相容範圍與 Breaking Change 規則 |
| Deprecation Policy | 是 | 公告、替代、期限與 Retired 條件 |
| Known Limitations | 是 | 已知限制與未驗證項目 |
| Approval Status | 是 | Draft、Reviewed、Approved 或 Rejected 及引用 |

## 核心定義

### Owned Data

Owned Data 是該 Domain Module 可以直接建立、修改與刪除的資料。其他模組不得直接操作，必須使用 Public Interface。

### Read-only External Data

Read-only External Data 是經另一 Domain Module 的公開 Query Interface 取得、但本 Module 不得直接修改的資料。取得副本不轉移資料擁有權。

### Public Interface

Public Interface 是其他 Domain Module、Application、Adapter 或 Extension 唯一可依賴的版本化能力，包括 Command、Query 與 Domain Event Contract。

### Private Implementation

Private Implementation 包含內部函式、資料表、Repository、Provider 細節與未公開資料結構。其他模組不得 Import、直接查詢或以其行為作為依賴。

### Domain Event

Domain Event 表示已發生的事實，不應要求接收者一定執行某個動作。候選名稱例如：

```text
MemberJoined
PointsGranted
AttendanceVerified
ReferralAttributed
OrderCompleted
```

### Command

Command 要求執行一項明確且可能改變狀態的動作，例如：

```text
GrantPoints
VerifyAttendance
AssignReferrer
RedeemCoupon
```

Command 必須定義 Permission、Tenant Scope、Idempotency 與 Error Model。

### Query

Query 查詢資料但不應修改狀態，例如：

```text
GetMemberBalance
GetTenantMembership
GetEventAvailability
```

## Contract 治理

- Contract 由 Module Owner 維護，Platform Architect 審核。
- Breaking Change 需要 Architecture Owner Tony 批准及 MAJOR 版本。
- Contract 的 `Approved` 不代表程式已 Implemented 或 Production Verified。
- Registry metadata 必須與 Contract、Module Lifecycle 與版本一致。
- 本文件不建立任何實際 API、Schema、Command Handler 或 Event Bus。

可複製模板見 [Module Contract Template](templates/MODULE-CONTRACT-TEMPLATE.md)。
