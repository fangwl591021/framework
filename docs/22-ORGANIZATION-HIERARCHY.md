# Organization Hierarchy

## Accepted Decision

Platform Core Framework 採用可選式組織階層：

```text
Tenant
├── Brand
│   ├── Shop
│   └── Shop
└── Shop
```

Tenant 是必要層級；Brand 與 Shop 是 Tenant 內的選用層級。詳細決策見 [ADR-004](adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md)。本文件只定義概念與 Scope，不建立 Schema。

## Tenant

Tenant 是最主要的資料與 Permission 隔離邊界，代表 SaaS 客戶、公司、組織、協會、平台加盟體系或企業帳戶。

每個 Application 業務資料都必須能判定 Tenant Scope。不同 Tenant 預設不共享 Point、Referral、CRM、Membership 或其他業務資料。

## Brand

Brand 是 Tenant 底下的選用組織範圍，代表品牌、產品線、子品牌或事業單位。不得強迫所有 Tenant 建立 Brand，也不得以 Brand 取代 Tenant 的資料隔離責任。

## Shop

Shop 是 Tenant 底下或 Brand 底下的選用營運範圍，代表實體門市、分店、據點、營業單位或線上營運單位。Shop 不得成為 Platform User 的身份主體。

## 支援場景

### 單店

```text
Tenant → Shop
```

單店 Tenant 不必建立 Brand。

### 多店單品牌

```text
Tenant → Brand → Multiple Shops
```

### 多品牌企業

```text
Tenant
├── Brand A → Shops
└── Brand B → Shops
```

### 無實體店組織

```text
Tenant
```

協會、課程平台、旅遊平台等不一定需要 Brand 或 Shop。

## Membership 與 Role

- **Tenant Membership**：Platform User 在 Tenant 下的業務會員關係，是 Point、Referral、CRM 與福利的預設歸屬基礎。
- **Brand-level Role**：Tenant Membership 在特定 Brand 的管理或營運角色；不得自動取得其他 Brand 權限。
- **Shop Membership**：Platform User 或 Tenant Membership 在特定 Shop 的參與關係；不得取代 Tenant Membership。
- **Permission Scope**：每項 Role 與 Permission 必須明確標示 Platform、Tenant、Brand 或 Shop Scope。

## Domain Scope

| Domain | 預設 Scope | 跨 Scope 規則 |
| --- | --- | --- |
| Point | Tenant Membership | 是否跨 Shop 共用由 Tenant Policy 明確決定；不得跨 Tenant |
| CRM | Tenant | Brand／Shop View 可限縮；不得未經 Policy 合併跨 Tenant Profile |
| Referral | Tenant | 可由 Tenant Policy 定義 Brand／Shop 歸屬；不得跨 Tenant 自動建立 |
| Event | Tenant | 可指定 Brand 或 Shop；參與與 Permission 仍保留 Tenant Scope |

## 強制原則

- Tenant 是最主要資料隔離邊界。
- Brand 與 Shop 是 Tenant 內部組織範圍。
- 跨 Shop Point 必須由 Tenant Policy 明確定義。
- Referral、CRM 與 Point 不得在未定義 Policy 下自動跨 Tenant。
- LINE UID 不得直接綁定 Shop 業務資料而跳過 Platform User、Identity Mapping 與 Tenant Membership。
- Shop、Brand 或外部 Login Identity 都不得取代 Platform User。
- Brand／Shop 的建立、移動、停用與刪除需保留 Permission 與 Audit Log 邊界。

## Domain Ownership and Visibility

| 能力 | Tenant Boundary | Optional Shop Behavior | Manager Visibility |
| --- | --- | --- | --- |
| Point | Account 與 Ledger 不跨 Tenant | 未有 Policy 時不跨 Shop；可限縮 Program | Shop Manager 只見授權 Shop；Tenant Admin 依 Permission 檢視 Tenant |
| Referral | Relationship 不跨 Tenant | Shop 只作來源／適用 Scope，不改變 Tenant Ownership | Shop Manager 只見其 Scope；不得推導其他 Shop 關係 |
| Attribution | Touch、Conversion Reference、Record 保留 Tenant | Touch 可帶 Shop；選擇需符合 Policy | Manager 只見授權 Campaign／Shop Evidence |
| Role Assignment | Tenant Role 不得擴張至 Platform／其他 Tenant | Brand／Shop Role 只在指定節點有效 | Manager 不得授予超過自己有效 Scope 的 Role |

Shop Manager 的「可見」不等於資料 Ownership。查詢仍由 Owner Module 提供，並同時驗證 Tenant Membership、Role、Resource、Action 與 Scope。

## Tenant Point Policy and Shop Point Policy

- Tenant Point Policy 決定 Point Program 是否在同 Tenant 多 Shop 共用。
- Shop Point Policy 只能在 Tenant Policy 授權範圍內限縮 Account、Grant、Redeem 或 Visibility，不得建立 Cross-tenant Point。
- 沒有明確 Policy 時，Point、Referral、Attribution、Role 與 Manager Visibility 都維持 Shop-scoped／最小範圍，不由 Application 猜測。
