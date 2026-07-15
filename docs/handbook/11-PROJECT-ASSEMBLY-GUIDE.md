# Project Assembly Guide

> Candidate Assembly 不代表完成整合、Runtime 或 Deployment

## 組裝流程

```text
Define Tenant Model
→ Select Modules
→ Select Adapters
→ Define Extensions
→ Define Configuration
→ Complete Contracts
→ Complete Data Boundaries
→ Complete Scenario Matrix
→ Review Schema
→ Implement Runtime
```

在選 Module 前先確認 Tenant／Brand／Shop、Platform User／Membership、Role／Permission 與資料區域。客戶差異依序放入 Configuration、Policy／Strategy、Extension；只有具獨立 Owned Data 與跨專案價值的能力才評估 Domain Module。正式 Gate 見 [Project Checklist](../09-PROJECT-CHECKLIST.md)。

## BookingOS Candidate Assembly

```text
Identity
Tenant
Membership
Permission
Booking Module
Staff Module
Service Module
Notification
LINE Adapter
```

Booking、Staff、Service Contract 尚未存在；此清單只說明可能的分層與依賴，不是批准的產品架構。

## TravelKeeper Candidate Assembly

```text
Identity
Tenant
Membership
Referral
Attribution
Content
Document
OCR
Notification
LINE Adapter
```

Referral 與 Attribution 必須分離；Travel-specific parsing／recommendation 留在 Extension，不能直接回灌 Core。

## K-Link Candidate Assembly

```text
Identity
Tenant
Membership
Point
Referral
Attendance
Redemption
Event
LINE Adapter
```

Location validation 是 Attendance Policy／Extension Candidate；Attendance 不直接修改 Point Ledger；Redemption 透過 Point 公開 Command 協作。

## Assembly Review

- 每個選用 Module 有 Owner、Contract、Registry、Version 與 Feature Flag。
- Adapter 不承載商業規則；Extension 不 import private implementation。
- Owned Data、Read-only External Data、Business Reference 與 Tenant Scope 明確。
- 交易情境、Idempotency、Audit、Correction、Retry、Reconciliation 完整。
- Physical Schema Review 通過後才進 Runtime；目前 Framework 尚未到此階段。
