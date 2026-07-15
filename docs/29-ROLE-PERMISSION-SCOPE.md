# Role and Permission Scope

> **Conceptual Model / Not a Database Schema**

## 核心概念

- **Role**：一組可命名、可配置的 Permission 集合。
- **Permission**：對 Resource 執行 Action 的授權能力。
- **Role Assignment**：將 Role 授予 Platform User 或 Tenant Membership，並指定 Scope、有效期間與 Actor。
- **Scope**：授權可作用的資料與組織邊界。

## Scope 類型

| Scope | 用途 |
| --- | --- |
| Platform | Platform Core 管理；不得由 Tenant Role 隱含取得 |
| Tenant | 單一 Tenant 內的管理或資料操作 |
| Brand | Tenant 內特定 Brand |
| Shop | Tenant 內特定 Shop |
| Own Record | 主體自己的會員、Point 或 Profile 資料 |
| Assigned Records | 明確分派給主體的案件或資源 |

相同 Platform User 可在 Tenant A 是 Tenant Admin、在 Tenant B 是 Member，權限不互相繼承。

## Candidate Roles

- Platform Admin
- Architecture Owner
- Tenant Owner
- Tenant Admin
- Brand Manager
- Shop Manager
- Merchant Staff
- Sales／Distributor
- Editor
- Finance
- Auditor
- Member
- Integration Service

這些是跨 Application 的候選語意。Platform Core 判斷 Permission、Action、Resource 與 Scope；Application 可自訂顯示名稱與 Role 組合，但不得改變隔離規則。

## 強制規則

- 登入成功不代表具有任何 Tenant 權限。
- Backend Command／Query 必須執行 Permission Check，不得只靠 UI 隱藏。
- Permission 採最小權限；Tenant Admin 不得存取其他 Tenant，Shop Manager 預設不得操作其他 Shop。
- Tenant Role 不得存取其他 Tenant；Brand／Shop Scope 不得擴張到同 Tenant 其他節點。
- 高風險動作如 Merge Identity、Adjust Points、Override Referral、Correct Attribution 必須使用明確 Permission 與 Audit。
- Role Assignment 建立、變更、撤銷與期限到期都保留歷史。
- Membership 停用時，相關 Tenant／Shop Assignment 不得繼續授權業務操作。
- Adapter 驗證成功不等於取得 Role。
- Permission Denied 回應不得洩露其他 Tenant 資源是否存在。

## Separation of Duties

Architecture Decision Approval、Tenant 商業操作、財務型 Point Adjustment 與 Audit Review 應可配置為不同 Permission；高風險 Application 可要求雙人審核，但本 Sprint 不指定 Workflow 實作。
