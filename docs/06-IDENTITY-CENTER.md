# Identity Center

## 目的

Identity Center 提供跨 Tenant、Brand、Shop 與登入通道的一致身份基礎。Identity Provider 只證明登入身份；Business Membership 保存 Tenant 業務關係，兩者不得混為同一主鍵。

## Identity Provider and Business Membership

- LINE Login、Google Login、Apple Login、Facebook Login、WhatsApp、WeChat、Email 或 Mobile 只提供 Provider Identity。
- Provider Identity 經 Identity Mapping 連結 Platform User。
- 登入成功不等於自動擁有任何 Tenant、Brand 或 Shop Permission。
- 同一外部 Identity 不得直接成為所有 Point、Referral、CRM、Order 或福利資料的主鍵。
- 不得用 `LINE UID + Shop ID` 取代 Platform User 與 Tenant Membership。

此分離已由 [ADR-001](adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md) 接受。

[ADR-008](adr/ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md) 進一步接受：任何 External Identity 都不得作 Business Primary Key。

## 身份與關係層級

### Platform User

平台層穩定身份，代表自然人或平台主體，可連結多個 Provider Identity 與多個 Tenant Membership。

### Identity Mapping

保存 Provider Identity 與 Platform User 的映射，包括 Provider、Provider Scope、驗證狀態、連結歷程與 Audit 要求。Identity Mapping 不授予 Business Permission。

### Tenant Membership

Platform User 在特定 Tenant 的業務會員關係，保存該 Tenant Scope 內的狀態、Role 與 Permission。Point、Referral、CRM、會員等級與福利不得保存於 Platform User。

### Brand-level Role

Tenant Membership 在特定 Brand 的管理或營運角色，不得自動擴張到其他 Brand。

### Shop Membership

Platform User 或 Tenant Membership 在特定 Shop 的參與關係；Shop Permission 不得自動擴張為整個 Tenant Permission。

```text
External Provider Identity
          |
    Identity Mapping
          |
     Platform User
       /        \
Tenant Membership  Tenant Membership
       |
 Brand-level Role / Shop Membership
```

## Adapter Boundary

Login Adapter 只處理外部驗證、簽章、Token Exchange 與格式轉換，不得：

- 直接建立跨 Tenant Permission
- 修改 Point、Referral、CRM 或福利
- 把 Provider Token 當作 Platform User 長期主鍵
- 依特定客戶規則決定 Tenant Membership

## 核心規則

- 同一 Platform User 可連結多個 Provider Identity。
- 同一 Platform User 可擁有多個 Tenant Membership，但資料與 Permission 必須隔離。
- 帳號連結、解除、合併與復原需明確驗證及 Audit Log。
- Email、Mobile 或 Provider Profile 不得在無證據下自動合併 Platform User。
- Provider 更換不得複製或污染既有 Tenant Membership。
- Permission 判斷交由 Permission Engine；Identity Center 不承擔商業授權規則。

## Identity Mapping Lifecycle

```text
Unverified
  → Provider Verified
  → Platform User Resolved
  → Identity Linked
  → Tenant Membership Resolved
```

同一 Provider Subject 若指向不同 Platform User，必須進入 Conflict，不得自動覆寫。姓名、相似 Email、部分 Mobile 或公司相同只形成 Duplicate Candidate；高風險 Merge 需人工 Evidence、Permission 與 Audit。完整模型見 [Identity Mapping Model](24-IDENTITY-MAPPING-MODEL.md) 與 [Duplicate, Merge and Migration](32-DUPLICATE-MERGE-MIGRATION.md)。

## 擴充與實作前置條件

新增 Provider 時，只能新增 Adapter、Configuration 與驗證流程，不得改變 Platform User、Identity Mapping、Tenant Membership 與 Shop Membership 基本語意。

建立 Schema 或 API 前，必須先完成 Module Contract、PII Handling、Account Linking、Merge／Recovery、Tenant Boundary 與 Migration Gap Analysis。

更多規則見 [Tenant Data Boundary](15-TENANT-DATA-BOUNDARY.md) 與 [Organization Hierarchy](22-ORGANIZATION-HIERARCHY.md)。
