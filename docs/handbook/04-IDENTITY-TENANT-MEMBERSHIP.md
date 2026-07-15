# Identity, Tenant and Membership

> 身份、組織、會員與權限必須分離

## 核心概念

| Concept | Responsibility | 不包含 |
| --- | --- | --- |
| Platform User | 跨 Provider 的平台主體 | Tenant Point、Referrer、CRM、Shop Role |
| Identity Mapping | Provider Context＋Subject 與 Platform User 的已驗證連結 | Tenant Membership、Permission |
| Tenant | 必要的資料與權限隔離根節點 | Platform User 身份本身 |
| Brand | Tenant 下選用品牌／事業節點 | Tenant 隔離責任 |
| Shop | Tenant 下選用營運節點 | 全平台身份 |
| Tenant Membership | Platform User 在一個 Tenant 的業務關係 | 其他 Tenant 資料 |
| Shop Membership | Membership 對同 Tenant Shop 的參與關係 | Tenant Membership 的替代品 |
| Role Assignment | Subject 在明確 Scope 的有效授權 | 身份或會員建立 |

正式來源：[Identity Center](../06-IDENTITY-CENTER.md)、[Organization Hierarchy](../22-ORGANIZATION-HIERARCHY.md)、[Membership Model](../25-MEMBERSHIP-MODEL.md)、[Role／Permission Scope](../29-ROLE-PERMISSION-SCOPE.md)。

## 跨 Tenant 案例

```text
Tony 在 Tenant A：
- 300 點
- Referrer Mary
- Shop Manager

Tony 在 Tenant B：
- 50 點
- Referrer David
- Member
```

兩組資料共享的是 Platform User 主體，不共享 Tenant Membership 的 Point Account、Referral、CRM 或 Role。Tenant A 的 Manager 權限不能在 Tenant B 使用；Shop 也不能取代 Tenant Scope。

## Identity Resolution

```text
Provider Verified
→ Platform User Resolved
→ Identity Mapping Linked
→ Tenant Membership Resolved
→ Permission Evaluated
```

- Provider UID、Email 或 Phone 只在 Identity Boundary 處理，不作 Domain Business Key。
- 登入成功只證明 Provider Identity，不隱含任何 Tenant Membership 或 Permission。
- Shop Membership 建立前，Membership 與 Shop 必須屬於同一 Tenant。
- 每個敏感 Command 都要重新驗證目前 Role Assignment 與 Scope。

Accepted Decisions：[ADR-001](../adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md)、[ADR-004](../adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md)、[ADR-008](../adr/ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md)。
