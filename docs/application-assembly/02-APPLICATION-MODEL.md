# Application Model

一個 Tenant 可擁有多個 Application，`application_key` 在 Tenant 內唯一。狀態為 `active`、`suspended`、`archived`。

- `active`：可進一步評估模組存取。
- `suspended`：所有可選模組拒絕執行。
- `archived`：MVP 終態，不可恢復。

Application context 只能由已驗證的 Runtime composition 建立；Header、URL 或 UI 選擇不得成為可信權限來源。所有 Repository 查詢要求 `tenantId` 與 `applicationId`。
