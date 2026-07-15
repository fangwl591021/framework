# Core Domain Model

> **Conceptual Model / Not a Database Schema**

本文件建立 Platform Core 的共同領域語言，只描述概念、責任與關係；不代表資料表、欄位、API 或 Runtime 已存在。

## 概念圖

```text
External Identity ── Identity Mapping ── Platform User
                                           │
                    Tenant ── Brand? ── Shop?
                       │                   │
                 Tenant Membership ── Shop Membership
                       │                   │
                 Role Assignment ─────────┘
                       │
        ┌──────────────┼──────────────────────────┐
        │              │                          │
 Point Account   Referral Relationship       Share Link
        │                                         │
 Point Transaction                         Attribution Touch
                                                  │
                                            Conversion
                                                  │
                                         Attribution Record
```

`?` 表示選用。所有 Tenant 業務概念必須保留 Tenant Scope；Shop 只能在 Tenant 內進一步限縮。

## 核心概念

| 概念 | 定義 | 主要 Owner |
| --- | --- | --- |
| Platform User | 跨登入 Provider 的平台身份，不保存 Tenant 業務狀態 | Identity Center |
| Identity Mapping | 外部 Provider Identity 與 Platform User 的受驗證映射 | Identity Center |
| Tenant | 主要資料、權限與政策隔離邊界 | Tenant Manager |
| Brand | Tenant 內選用的品牌或事業範圍 | Tenant Manager |
| Shop | Tenant／Brand 內選用的營運範圍 | Tenant Manager |
| Tenant Membership | Platform User 與單一 Tenant 的業務會員關係 | Membership Engine |
| Shop Membership | Tenant Membership 與特定 Shop 的參與關係 | Membership Engine |
| Role Assignment | 主體在指定 Scope 取得 Role 的可稽核配置 | Permission Engine |
| Point Account | Membership 在 Point Program 與選用 Shop Scope 下的帳戶 | Point Engine |
| Point Transaction | Point Account 不可任意覆寫的帳務異動事實 | Point Engine |
| Referral Relationship | Tenant 內長期、直接推薦人與被推薦人關係 | Referral Engine |
| Share Link | 可追蹤分享來源與活動的安全連結參考 | Attribution Engine |
| Attribution Touch | 使用者與分享、Campaign 或 Channel 的行銷互動 | Attribution Engine |
| Conversion | 可被歸因的已完成業務結果參考 | 產生轉換的 Domain Module |
| Attribution Record | 某 Conversion 依版本化 Policy 得出的最終歸因 | Attribution Engine |

## 建模語言

- **Entity**：具穩定身份、狀態可隨時間改變的概念，例如 Tenant Membership。
- **Aggregate**：保護一致性規則的交易邊界；外部只能透過 Aggregate Root 操作。
- **Value Object**：由值定義、不可獨立識別的概念，例如 Tenant Scope 或時間區間。
- **Policy**：可版本化、可替換的決策規則，例如 Attribution Model。
- **Event**：已發生且不可改寫的領域事實，例如 `MembershipCreated`。
- **Command**：要求改變狀態的意圖，例如 `AssignReferrer`。
- **Query**：不改變狀態的資料讀取，例如 `GetPointBalance`。

## Boundary 原則

- Platform User、Tenant Membership、Shop Membership 是不同 Entity。
- External Identity 只能透過 Identity Mapping 被解析，不可成為 Business Primary Key。
- Referral Relationship、Attribution Touch、Attribution Record 是不同概念與生命週期。
- Point Balance 由 Point Transaction Ledger 推導，D1 是 Source of Truth；KV 不得成為唯一來源。
- 本模型不批准任何 Schema、Storage Layout 或實作技術。
