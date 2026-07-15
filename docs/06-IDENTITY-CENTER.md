# Identity Center

## 目的

Identity Center 提供跨租戶、跨商店與跨登入通路的一致身份基礎。外部登入帳號只是驗證身份的方法，不是平台會員資料本身。

## 身份層級

### Platform User

平台層唯一身份，代表同一個自然人或系統主體，可連結多個登入提供者與多個成員身份。

### Tenant Member

Platform User 在特定 Tenant 內的成員身份，擁有該 Tenant 範圍內的狀態、角色與權限。

### Shop Member

Platform User 或 Tenant Member 在特定 Shop 的參與身份；Shop 權限不得自動擴張為整個 Tenant 權限。

### Identity Mapping

保存外部登入提供者識別與 Platform User 的映射。映射必須記錄提供者、提供者範圍、驗證狀態與連結歷程。

```text
External Login Identity
          |
    Identity Mapping
          |
     Platform User
       /        \
Tenant Member  Tenant Member
     |
 Shop Member
```

## 登入提供者

Identity Center 應以 Provider Adapter 擴充以下登入方式：

- LINE Login
- Google Login
- Apple Login
- Facebook Login
- WhatsApp
- WeChat
- 未來其他符合安全與隱私要求的提供者

Provider Adapter 只處理外部驗證與資料轉換，不直接建立跨租戶權限或改寫成員資料。

## 核心規則

- 同一 Platform User 可連結多個外部登入身份。
- 同一 Platform User 可屬於多個 Tenant，但各 Tenant Member 必須隔離。
- 登入成功只代表身份已驗證，不代表具有任何 Tenant 或 Shop 權限。
- 帳號連結、解除、合併與復原必須有明確驗證及稽核紀錄。
- Provider Token 不得成為平台長期身份主鍵。
- 不同國家或通路的登入差異由 Adapter 處理，Core 保持一致身份模型。
- 權限判斷交由 Permission Engine，Identity Center 不承擔商業授權規則。

## 擴充原則

新增登入提供者時，只能新增 Adapter、設定與驗證流程；不得修改 Platform User、Tenant Member 與 Shop Member 的基本語意。
