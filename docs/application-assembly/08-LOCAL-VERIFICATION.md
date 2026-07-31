# Local Verification

Migration `0006_application_assembly.sql` 僅在 Fresh Isolated Local D1 套用，連同 `0001` 至 `0005` 驗證。

已驗證：8 tables、12 named indexes、16 new triggers、10 permissions、FK integrity、forced migration rollback、A/B Application、purchased/trial/revoked、dependency/cycle/conflict、Navigation/Dashboard no-side-effect、Traffic ordering/single claim、versioned access fence、concurrent disable/revoke/expiry、idempotent release、Event/Network shared pipeline、Tenant isolation、Audit/Idempotency、configuration bounds、health/ready regression。

本結果只代表 Local／Isolated D1 與 local Worker bundle；不是 Remote D1、Production Migration 或 Deployment 證據。