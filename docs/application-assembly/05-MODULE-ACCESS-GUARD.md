# Module Access Guard

固定判斷順序：Tenant/Application context、Application lifecycle、Catalog、Entitlement validity、Enablement、Dependencies、active Membership/Permission、Traffic admission、Domain invocation。

拒絕碼：`APPLICATION_NOT_FOUND`、`APPLICATION_NOT_ACTIVE`、`MODULE_NOT_REGISTERED`、`MODULE_NOT_AVAILABLE`、`MODULE_NOT_ENTITLED`、`MODULE_ENTITLEMENT_EXPIRED`、`MODULE_NOT_ENABLED`、`MODULE_DEPENDENCY_MISSING`、`MODULE_CONFLICT`、`PERMISSION_DENIED`、`TRAFFIC_NOT_ADMITTED`。

跨 Tenant 查詢回傳同樣的 not-found 邊界，不洩漏其他 Tenant 的 Application。Observability 是 sidecar；記錄失敗不得改變 Gate 的正式決策。
