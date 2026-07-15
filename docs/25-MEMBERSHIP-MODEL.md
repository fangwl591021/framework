# Membership Model

> **Conceptual Model / Not a Database Schema**

## 三個不同問題

| 概念 | 回答的問題 | 不負責 |
| --- | --- | --- |
| Platform User | 「這是誰？」 | Tenant 業務狀態與權限 |
| Tenant Membership | 「此人在此 Tenant 是什麼關係？」 | 其他 Tenant 的資料 |
| Shop Membership | 「此 Membership 參與哪些 Shop？」 | 取代 Tenant Membership |

## Tenant Membership

Tenant Membership 可表達以下概念：

- Status 與 Lifecycle
- Membership Source
- Tier 與有效期間
- Referrer Reference
- CRM Labels 與 Tenant Profile Reference
- Role Assignment Reference
- Consent 與版本
- 建立、停用、恢復與合併歷史

同一 Platform User 在同一 Tenant 最多一個 Active Tenant Membership；在不同 Tenant 的 Membership 必須完全隔離。

## Shop Membership

- 一個 Tenant Membership 可有零到多個 Shop Membership。
- 建立 Shop Membership 前必須存在同 Tenant 的 Tenant Membership。
- Shop Membership 只表達參與或歸屬，不自動授予整個 Tenant 或其他 Shop 權限。
- 跨 Shop CRM、Tier、Coupon、Point、Referral、Event 或 Redemption 需 Tenant Policy；未定義時預設不共享。

## Membership Source

標準來源語意包括：

- Direct
- Referral
- Invitation
- Imported
- OCR Claim
- Campaign
- Admin Created
- Migration

Source 必須保留原始時間、來源參考與 Audit，不因日後登入或分享覆寫。

## Role 與身份

Role Assignment 是 Permission Engine 管理的授權關係，不應為「管理員」「店員」建立另一套 Identity 或 Membership Table。相同 Platform User 可在 Tenant A 是管理者、在 Tenant B 是一般會員。

## 不變條件

- Platform User ≠ Tenant Membership ≠ Shop Membership。
- Provider Identity 不可直接承載 Membership 業務狀態。
- Tier、Point、Referral、CRM Labels 與 Consent 不得跨 Tenant 自動合併。
- Membership 停用保留歷史，不刪除既有 Point Transaction、Referral 或 Attribution Evidence。

生命週期見 [Lifecycle State Model](31-LIFECYCLE-STATE-MODEL.md)。

## Concept Detail

Tenant Membership 的概念內容至少包括 `membership status`、`joined at`、`source`、`member tier`、`referrer`、`CRM labels`、`tenant roles`、`tenant-specific profile`、`consent` 與 `lifecycle state`。

Shop Membership 的概念內容至少包括 `shop status`、`shop joined at`、`shop roles`、`shop-specific tags`、`staff／merchant relationship` 與 `shop-specific preference`。這些是概念資料，不是 Schema 欄位。

- 禁止為同一自然人在不同 Shop 複製 Platform User。
- 店家員工、一般會員、Merchant Staff、經銷商或管理者應以 Role Assignment 與 Permission Scope 區分，不建立彼此不相容的身份表。
