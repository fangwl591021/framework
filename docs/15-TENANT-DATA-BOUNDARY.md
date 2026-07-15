# Tenant Data Boundary

## Accepted Boundary

本文件整合 [ADR-001](adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md) 與 [ADR-004](adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md)。本 Sprint 只定義概念與 Scope，不建立 Schema 或 Migration。

## Identity Layer

### Platform User

代表自然人或平台主體，可連結多個 Provider Identity，但不直接保存特定 Tenant、Brand 或 Shop 的 Point、Referral、CRM、會員等級與福利。

### Identity Mapping

將 LINE UID、Google Subject ID、Apple Subject ID、Facebook User ID、WhatsApp Identity、Email、Mobile 等外部 Identity 連結至 Platform User。Identity Mapping 不等於 Tenant Membership，也不授予 Business Permission。

不得只用 LINE UID 作全系統業務主鍵，也不得用 `LINE UID + Shop ID` 取代 Platform User。

## Organization Layer

```text
Tenant
├── Brand
│   └── Shop
└── Shop
```

- **Tenant**：必要層級，是主要 Data、Permission、Configuration 與 Audit 隔離邊界。
- **Brand**：Tenant 內選用的品牌、產品線或事業單位 Scope。
- **Shop**：Tenant 或 Brand 下選用的門市、據點或營運單位 Scope。

Brand、Shop 都不得取代 Tenant 或 Platform User。

## Membership Layer

### Tenant Membership

Platform User 在單一 Tenant 的業務會員關係。下列資料預設屬於 Tenant Membership 或該 Tenant 的 Domain Module：

- 加入時間、Member Status、等級與標籤
- Referral Relationship
- Point Account 與福利
- CRM Profile
- Tenant Permission

### Brand-level Role

Tenant Membership 在特定 Brand 的 Role。它可限縮 Permission，不得自動取得其他 Brand 或整個 Platform 權限。

### Shop Membership

Platform User 或 Tenant Membership 在特定 Shop 的參與關係。它不取代 Tenant Membership，也不自動擴張到其他 Shop。

## Conceptual Relationship

```text
Platform User
    ├── Identity Mapping: LINE
    ├── Identity Mapping: Google
    ├── Tenant Membership: Tenant A
    │       ├── Brand-level Role: Brand A1
    │       ├── Referral Relationship
    │       ├── Point Account
    │       ├── CRM Profile
    │       └── Shop Membership
    └── Tenant Membership: Tenant B
            ├── Referral Relationship
            ├── Point Account
            └── CRM Profile
```

## Scope Rules

| 資料／能力 | 預設 Scope | 規則 |
| --- | --- | --- |
| Identity Mapping | Platform User | 不保存 Tenant Business Data |
| Tenant Membership | Tenant | 不跨 Tenant 合併 |
| Brand-level Role | Brand within Tenant | 不自動擴張到其他 Brand |
| Shop Membership | Shop within Tenant | 不取代 Tenant Membership |
| Point | Tenant Membership | 跨 Shop 需明確 Tenant Policy；不得跨 Tenant |
| Referral | Tenant | Brand／Shop 歸屬需 Policy；不得跨 Tenant 自動建立 |
| CRM | Tenant | Brand／Shop View 可限縮；不得跨 Tenant 自動合併 |
| Event | Tenant | 可指定 Brand／Shop，仍保留 Tenant Scope |

## Cross-Shop Policy

Point、CRM View、Referral Attribution 或 Event Participation 是否跨 Shop，必須由 Tenant Policy 明確定義：

- 適用 Domain Module 與資料類型
- 允許的 Brand／Shop 範圍
- Permission 與 Audit Log
- 生效時間與變更方式
- 既有資料與回滾處理

沒有明確 Policy 時，預設不跨 Shop。任何情況都不得因此跨 Tenant。

## 強制隔離規則

- Query、Write、Cache Key、R2 Object、Domain Event、Queue Message 都需保留 Tenant Scope。
- Brand／Shop Scope 只能在 Tenant Scope 內限縮或經 Policy 擴張。
- Permission 同時驗證 Platform User、Tenant Membership、Role、Resource、Action 與 Scope。
- Point、Referral、CRM 不得以 Platform User 作唯一範圍聚合後回寫。
- Login Adapter 不能繞過 Identity Mapping 與 Tenant Membership。
- Cross-Tenant 管理必須是明確 Platform Permission 並具 Audit Log。

## Boundary Verification

1. 相同 LINE UID 在兩個 Tenant 登入時，只能讀寫各自 Tenant Membership 資料。
2. Tenant A 的 Point、Referral、CRM、Cache 與 Domain Event 不出現在 Tenant B。
3. 未建立 Tenant Membership 的 Platform User 不因登入成功取得 Tenant Permission。
4. Shop Membership 不自動取得同 Tenant 其他 Shop Permission。
5. 跨 Shop Policy 不得擴張為跨 Tenant Policy。
6. Provider 更換不會複製或錯誤合併 Tenant Membership。

## Sprint 4 Domain Scope Addendum

- **Point Account**：固定屬於單一 Tenant Membership 與 Point Program，可選 Shop Scope；跨 Shop 預設不共享。
- **Referral Relationship**：固定屬於單一 Tenant，預設一個 Active Direct Referrer；不同 Tenant 各自判定。
- **Attribution Touch／Record**：Touch 與 Record 都保留 Tenant；每個 Conversion 只在其 Tenant 內選擇結果。
- **Role Assignment**：Tenant、Brand、Shop Scope 只能在同 Tenant 內限縮；Own Record／Assigned Records 不授予 Cross-tenant View。
- **Coupon、Tier、CRM、Event、Check-in、Redemption、Commission**：不得因同一 Platform User 或相同 Provider Identity 自動跨 Tenant 或 Shop 共用。

Cross-shop Point、Coupon、CRM、Tier、Referral、Event 與 Redemption 只能由明確 Tenant Policy 開啟；預設一律不共享。Policy 必須記錄 Owner、適用 Shop、Effective Time、Rule Version、Permission、Audit、既有資料處理與回滾／Correction 方法。
