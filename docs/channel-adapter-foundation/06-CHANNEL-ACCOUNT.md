# Channel Account

A channel account is Tenant- and Application-scoped and points to a server-owned catalog adapter. Status and version transitions are constrained; terminal or disabled accounts cannot process. Catalog rows are immutable after reviewed migration installation.

The local fixture account is `enabled_local_only`. LINE, Telegram, and generic webhook accounts remain disabled. Clients cannot choose trusted Tenant, Application, adapter, endpoint, secret, or capability authority.

