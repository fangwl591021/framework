# Security Boundary

- Client message 不得指定可信 Tenant/Application/Role/Permission。
- Workbench 使用前要求 active membership 所具 `conversation:use`；Domain service 再驗正式 operation permission。
- Prompt／command injection、SQL、internal method 與 arbitrary tool 被拒絕。
- Domain invocation 才 claim Traffic；Slot／clarification 不 claim Domain budget。
- Module invocation 在 callback 前取得並重驗 Access Snapshot；停用、撤銷、到期或 Application suspend 使 stale operation 失敗。
- Mutation 使用 Plan 固定 idempotency key；Message replay 與 immutable execution evidence 防止重複效果。
- Observability 是 sidecar，失敗不改變正式結果；Observation 不含原始訊息。
- SQL 全部參數化，Tenant-scoped query 必須帶 tenantId，所有 list bounded。
- Formal Adapter 僅依賴 typed public Application Service Port；無 Repository、SQL、reflection 或任意 tool invocation。
