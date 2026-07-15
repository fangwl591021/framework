# Tenant Data Boundary

## 目的

本文件正式定義平台身份與 Tenant 業務資料的概念邊界。本 Sprint 不建立資料表、欄位、Schema 或 Migration。

## Platform User

Platform User 代表自然人或平台主體的穩定身份。它可以連結多個登入 Provider，但不直接保存特定 Tenant 或 Shop 的點數、介紹人、會員等級、標籤、優惠與福利歸屬。

## Identity Mapping

Identity Mapping 將外部身份連結到 Platform User，包括：

- LINE UID
- Google Subject ID
- Apple Subject ID
- Facebook User ID
- WhatsApp Identity
- Email
- Mobile
- 未來其他登入 Provider

Identity Mapping 只處理身份連結與驗證，不授予 Tenant 權限，也不保存 Tenant 業務資料。不得只使用 LINE UID 作為全系統業務資料的唯一主鍵；也不得把 `LINE UID + Shop ID` 直接定義成自然人的 Platform User。

## Tenant

Tenant 代表一個企業、品牌、組織或獨立 SaaS 客戶，是資料、Configuration、Permission、Audit Log 與營運責任的主要隔離邊界。

## Tenant Membership

Tenant Membership 代表同一 Platform User 在特定 Tenant 下的會員關係。下列資料原則上屬於 Tenant Membership 或該 Tenant 的 Domain Module：

- 加入時間與會員狀態
- 介紹人與 Referral Relationship
- 會員等級與標籤
- Shop 歸屬與可使用權限
- 該 Tenant 的 Point Account
- 該 Tenant 的優惠與福利
- 該 Tenant 的 CRM 關係

同一 Platform User 在不同 Tenant 的 Tenant Membership 必須獨立建立、授權、查詢與刪除。

## Shop Membership

當 Tenant 下存在多家 Shop，才建立 Shop Membership。它表達 Platform User 或 Tenant Membership 在單一 Shop 的參與關係，不得自動取得整個 Tenant 的資料或權限。

## 概念關係

```text
Platform User
    ├── Identity Mapping: LINE
    ├── Identity Mapping: Google
    ├── Tenant Membership: Tenant A
    │       ├── Referral Relationship
    │       ├── Point Account
    │       ├── CRM Profile
    │       └── Shop Membership
    └── Tenant Membership: Tenant B
            ├── Referral Relationship
            ├── Point Account
            ├── CRM Profile
            └── Shop Membership
```

因此同一個人可以在 Tenant A 有 300 點、在 Tenant B 有 50 點；在 A 的介紹人是 Tony、在 B 的介紹人是 Mary；使用同一 LINE UID 登入，但各 Tenant 的資料不得互相污染。

## 強制隔離規則

- 每個 Tenant Domain 寫入都必須有明確 Tenant Context。
- 任何 Query、Cache Key、R2 Object Key、Domain Event 與 Queue Message 都必須保留 Tenant Scope。
- Permission 應同時驗證 Platform User、Tenant Membership、資源與操作。
- Point、Referral、CRM 與優惠資料不得以 Platform User 為唯一範圍聚合後回寫。
- Adapter 提供的外部身份不能繞過 Identity Mapping 與 Tenant Membership。
- 跨 Tenant 管理與分析必須是明確的 Platform 權限，不得由一般 Tenant 權限推導。
- 刪除或停用單一 Tenant Membership 不得破壞其他 Tenant 的身份與關係。

## 邊界驗收案例

1. 相同 LINE UID 在兩個 Tenant 登入時，只能看到各自 Tenant Membership 資料。
2. Tenant A 的 Point、Referral、CRM、Cache 與通知事件不可出現在 Tenant B。
3. 未建立 Tenant Membership 的 Platform User 不因登入成功自動取得 Tenant 權限。
4. Shop Membership 權限不可自動擴張到同 Tenant 的其他 Shop。
5. 外部 Provider 更換或新增時，既有 Tenant Membership 不應被複製或合併錯誤。
