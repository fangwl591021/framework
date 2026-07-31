# Catalog, Entitlement, and Enablement

Module Catalog 由 Platform Operator 經 reviewed migration 與受控 Application service 管理，Tenant 不可註冊模組。

Entitlement 與 Enablement 分離：

- Entitlement：`included`、`purchased`、`trial`、`expired`、`revoked`。
- Enablement：`enabled`、`disabled`。

Trial 必須有 `valid_until`。Expired/Revoked 不可使用。關閉或撤銷不刪除 Domain data 或 configuration。Entitlement transition 寫入 immutable history；mutation 使用 Core Audit 與 Idempotency。
