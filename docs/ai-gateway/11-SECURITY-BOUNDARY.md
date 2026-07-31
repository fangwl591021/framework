# Security Boundary

Trusted Context 必須由 Runtime 建立，client header 不可信。Tenant／Application／Membership 必須同 scope，並先通過 Traffic、Module 與 Permission Gate。

SQL 全部參數化；Repository 沒有省略 tenantId 的 tenant query；list bounded；不提供 arbitrary prompt／URL／raw response API；Observability 為旁路且不保存敏感 payload。
