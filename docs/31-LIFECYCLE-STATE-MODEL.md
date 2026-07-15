# Lifecycle State Model

> **Conceptual states / Not database enums**

狀態名稱是共同語言，不是 Schema Enum。每次 Transition 必須保存 Actor、Source、Reason、Time、Correlation 與必要 Evidence；歷史型領域優先使用 Inactive、Revoked、Merged、Reversed 或 Corrected，不以 Delete 消除事實。

## State Matrix

| Aggregate | States | Allowed Transitions | Business Operations | History | Who May Change | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Platform User | Pending, Active, Suspended, Merged, Closed | Pending→Active; Active↔Suspended; Active/Suspended→Merged/Closed | Active 可解析業務身份；Suspended 不可登入；Merged 只導向 Target | 永久保留 Merge／Close 參考 | Identity Service；高風險由授權 Admin | 所有非 Pending Transition |
| Identity Mapping | Unverified, Verified, Active, Suspended, Revoked, Conflict | Unverified→Verified→Active; Active↔Suspended; Any→Conflict/Revoked | Active 可用於解析；Conflict／Revoked 不可登入 | 保留 Provider、驗證與連結歷史 | Provider Adapter + Identity Center；衝突人工處理 | 連結、解除、衝突、復原 |
| Tenant Membership | Pending, Active, Suspended, Inactive, Merged | Pending→Active; Active↔Suspended; Active/Suspended→Inactive/Merged | Active 可執行政策允許操作；Suspended／Inactive 不可新增業務異動 | 不刪除 Tier、Source、Referral、Point 關聯 | Membership Engine；Admin 需 Permission | 建立、停用、恢復、Merge |
| Shop Membership | Pending, Active, Suspended, Inactive | Pending→Active; Active↔Suspended; Active/Suspended→Inactive | Active 才可參與該 Shop 操作 | 保留 Shop 與來源歷史 | Membership Engine／Shop Manager 依 Scope | 建立、變更、撤銷 |
| Referral Relationship | Pending, Active, Superseded, Revoked, Rejected | Pending→Active/Rejected; Active→Superseded/Revoked | Active 才是目前 Direct Referrer | 舊關係不可刪除 | Referral Engine；Override 需授權 Admin | 全部 Transition |
| Attribution Record | Proposed, Active, Corrected, Rejected, Unattributed | Proposed→Active/Rejected/Unattributed; Active→Corrected | Active 或 Unattributed 表示已完成判定 | Correction 建立新 Record 並連結舊 Record | Attribution Engine；人工 Correction 需 Permission | Policy、Evidence、Reason 全記錄 |
| Point Account | Pending, Active, Suspended, Closed | Pending→Active; Active↔Suspended; Active/Suspended→Closed | Active 可交易；Suspended 僅允許政策定義的 Reverse／查詢；Closed 僅查詢 | Ledger 永久保留，不以 Close 刪除 | Point Engine；Admin 依 Permission | 開立、停用、恢復、關閉 |

## Transition Source

來源至少可區分 User Command、Admin Command、Provider Verification、Domain Event、Policy Decision、Migration 與 Scheduled Expiration。Domain Event 重送必須 Idempotent；Migration 必須保留 Legacy Reference。

## 共通規則

- State Transition 由 Owner Module 執行，其他 Module 只能送 Command 或消費 Event。
- Suspended 不等於 Deleted；Merged 不等於兩份資料直接相加。
- 不允許跳過必要驗證，例如 Identity Mapping 不可由 Unverified 直接作 Business Identity。
- 允許的操作需同時考慮 State、Tenant Scope、Permission 與 Policy Version。
