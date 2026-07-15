# Point Ledger Physical Schema

> Proposal Only · Do Not Execute · No Failed Intent in Ledger

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

## `point_programs`

候選欄位：`id TEXT`、`tenant_id TEXT`、`name`、`point_kind`、`scope_mode`、`status`、`rule_version`、`config_version`、UTC millisecond timestamps。

- `scope_mode CHECK ('shop_isolated','tenant_shared','selected_shop_group_future')`。
- `selected_shop_group_future` 只能保存未啟用狀態；沒有 group schema 前不得啟用。
- rule／config version 只識別已使用 policy，不回寫歷史 transaction。

## `point_accounts`

包含 `tenant_id`、`tenant_membership_id`、`point_program_id`、optional `shop_id`、`scope_key`、`status`、`frozen_at`、`closed_at` 與 timestamps。

- `scope_key` 可保留作查詢或顯示用的次級 reference，但不是 Active Account 唯一性的最終真相。
- Tenant-shared Account 使用 Partial Unique Index `(tenant_id, tenant_membership_id, point_program_id) WHERE status='active' AND shop_id IS NULL`。
- Shop-scoped Account 使用 Partial Unique Index `(tenant_id, tenant_membership_id, point_program_id, shop_id) WHERE status='active' AND shop_id IS NOT NULL`。
- Composite FK 確保 account、membership、program、optional shop 同 Tenant；program `scope_mode` 與 `shop_id` 的合法組合仍由 transaction validation 與 reconciliation 驗證。

## `point_transactions`

只保存正式 Ledger Entry：`grant`、`deduct`、`redeem`、`expire`、`reverse`、`adjust`。

候選欄位：`id`、`tenant_id`、`point_account_id`、`operation`、`signed_amount INTEGER`、`business_type`、`business_reference`、`rule_version`、`idempotency_record_id`、`original_transaction_id`、`actor_type`、`actor_reference`、`reason_code`、`occurred_at`、`created_at`、`audit_reference`。

`idempotency_record_id` 以 `(tenant_id, idempotency_record_id)` Composite FK 指向 Tenant-scoped Idempotency Record。Point Transaction 不能引用 Platform Scope 或其他 Tenant 的 Stored Result；單欄 ID FK 不視為 Tenant Isolation。

- `signed_amount != 0`；禁止 floating point。
- Grant／Reverse／Adjust 的正負語意由 Contract＋CHECK candidate 共同限制；所有 operation 的符號矩陣需 Tony 批准。
- Reverse／Adjust 是正式 Entry；Original 與新 Entry 必須同 Tenant、同 Account。
- Insufficient Balance、Permission Denied、Scope Violation、Conflict、Expired、Invalid State、Validation Failure **不建立 row**；只保存 Idempotency Stored Result／Command Result／必要 Audit。
- 不得 UPDATE `signed_amount`、不得 DELETE；實際不可變性需 Repository permission、trigger candidate 或 application policy 再審查。
- 同 Original 是否只允許一次完整 Reverse、是否允許 partial reverse 尚未決定；SQL 只提出 `original_transaction_id` index，不假裝已解決。
- Expire batch 使用 `business_type='expiration_batch'`＋穩定 reference candidate；Adjust 需高風險 permission 與 audit。

## `point_balance_projections`

候選：`point_account_id` PK、`tenant_id`、`balance INTEGER`、`ledger_watermark`、`projection_version`、`updated_at`。

- 只由有效 Ledger Entry 推導，failed intent 不參與。
- D1 Ledger 是 Source of Truth；projection／KV 可重建。
- 是否與 Ledger insert 同一 local transaction 更新，取決於 concurrency／hot account 測試；替代方案是 async rebuild＋freshness contract。
- Reconciliation 比對 ledger sum、watermark 與 projection version；drift 不可直接改 Ledger。

## Open Decisions

Internal ID generator、scope key 的非權威顯示／查詢格式、partial reverse、single-reverse guard、projection atomicity、hot account serialization、ledger retention／archive 都需 Architecture Owner 決定或要求證據。Active Account 唯一 Winner 不再依賴 scope key。

SQL：[002-point-ledger.sql](schema/proposals/002-point-ledger.sql)。
