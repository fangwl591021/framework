# Identity Center

## 目的

Identity Center 提供跨 Tenant、跨 Shop 與跨登入通道的一致身份基礎。外部登入帳號只是驗證身份的方法，不是 Tenant 會員資料本身。

## 身份與關係層級

### Platform User

平台層唯一身份，代表同一個自然人或平台主體，可連結多個登入 Provider 與多個 Tenant Membership。

### Tenant Membership

Platform User 在特定 Tenant 內的會員關係，擁有該 Tenant 範圍內的狀態、角色與 Permission。Point、Referral、CRM 與福利等資料不得保存於 Platform User。

### Shop Membership

Platform User 或 Tenant Membership 在特定 Shop 的參與關係；Shop Permission 不得自動擴張為整個 Tenant Permission。

### Identity Mapping

保存外部 Provider Identity 與 Platform User 的映射。映射必須記錄 Provider、Provider Scope、驗證狀態與連結歷程。

```text
External Provider Identity
          |
    Identity Mapping
          |
     Platform User
       /        \
Tenant Membership  Tenant Membership
     |
 Shop Membership
```

## 登入 Provider

Identity Center 應以 Adapter 擴充以下登入方式：

- LINE Login
- Google Login
- Apple Login
- Facebook Login
- WhatsApp
- WeChat
- 未來其他符合安全與隱私要求的 Provider

Adapter 只處理外部驗證與格式轉換，不直接建立跨 Tenant Permission 或改寫 Tenant Membership。

## 核心規則

- 同一 Platform User 可連結多個外部 Provider Identity。
- 同一 Platform User 可擁有多個 Tenant Membership，但資料與 Permission 必須隔離。
- 登入成功只代表身份已驗證，不代表具有任何 Tenant 或 Shop Permission。
- 帳號連結、解除、合併與復原必須有明確驗證及 Audit Log。
- Provider Token 不得成為 Platform User 的長期主鍵。
- 不得只使用 LINE UID 作為全系統業務資料的唯一主鍵。
- 不同國家或通道的登入差異由 Adapter 處理，Platform Core 保持一致身份模型。
- Permission 判斷交由 Permission Engine，Identity Center 不承擔商業授權規則。

## 擴充原則

新增登入 Provider 時，只能新增 Adapter、Configuration 與驗證流程；不得修改 Platform User、Tenant Membership 與 Shop Membership 的基本語意。

更完整的資料隔離規則見 [Tenant Data Boundary](15-TENANT-DATA-BOUNDARY.md)。
