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

候選欄位：`id`、`tenant_id`、`point_account_id`、`operation`、`signed_amount INTEGER`、`business_type`、`business_reference`、`rule_version`、`idempotency_record_id`、`idempotency_generation`、固定為 `completed` 的 `idempotency_status`、`original_transaction_id`、`projection_version`、`resulting_balance`、`actor_type`、`actor_reference`、`reason_code`、`occurred_at`、`created_at`、`audit_reference`。

Point Transaction 以 `(tenant_id, idempotency_record_id, idempotency_generation, idempotency_status)` Composite FK 指向同 Tenant、同 processing generation 且已完成的 Idempotency Record。`uq_point_transactions_idempotency_effect` 保證同一 Tenant Idempotency Record 最多產生一筆正式 Point Ledger Effect；Platform Scope、其他 Tenant、舊 generation 或非 Completed Record 都不能成為成功 Ledger Entry 的依據。

- `signed_amount != 0`；禁止 floating point。Grant 為正；Deduct／Redeem／Expire 為負；Adjust 必須是經批准的非零差額。
- `projection_version` 是該 Account 的正式 Ledger Sequence；`uq_point_transactions_account_version` 讓每個 Account Version 只有一筆 Ledger Winner。`resulting_balance` 必須等於同一 transaction 更新後的 Projection Balance，並供 reconciliation 驗證。
- Reverse／Adjust 是正式 Entry；Original 與新 Entry 必須同 Tenant、同 Account。
- 初版 Reverse Policy 為 **Single Full Reverse**：eligible Original 最多一筆 Reverse，由 `uq_point_transactions_single_full_reverse` 選出 Winner；`trg_point_transactions_reverse_guard` 在 Insert 前驗證 Original 不是 Reverse、同 Tenant／Account，且 Reverse Amount 精確等於 Original Amount 相反數；任一不符以 `RAISE(ABORT, 'point_reverse_guard_mismatch')` 拒絕。
- Partial Reverse 不支援；未來若需要，必須建立 remaining reversible amount、累計上限、獨立 Contract 版本與新 ADR。
- Insufficient Balance、Permission Denied、Scope Violation、Conflict、Expired、Invalid State、Validation Failure **不建立 row**；只保存 Idempotency Stored Result／Command Result／必要 Audit。
- 不得 UPDATE `signed_amount`、`projection_version`、`resulting_balance`，不得 DELETE；實際不可變性需 Repository permission、trigger candidate 或 application policy 再審查。
- Expire batch 使用 `business_type='expiration_batch'`＋穩定 reference candidate；Adjust 需高風險 permission 與 audit。

## `point_balance_projections`

候選：`point_account_id` PK、`tenant_id`、`balance INTEGER CHECK balance >= 0`、`ledger_watermark`、從 `0` 單調遞增的 `projection_version`、`consistency_status`、`last_reconciled_at`、`updated_at`。

- 初版採 **Synchronous Authoritative Projection Row**：建立 Point Account 時在同一 local transaction 建立 `balance=0`、`projection_version=0`、`ledger_watermark=NULL`、`consistency_status='healthy'` 的唯一 Projection。
- 每一筆正式 Ledger Entry 必須在同一 D1 local transaction 更新 Projection；async Projection 不得作扣點核准來源。
- Deduct／Redeem／Expire／負 Adjust 使用條件式 Compare-and-Update：目前 generation／owner 有效、`consistency_status='healthy'`、expected version 相符且 `balance + signed_amount >= 0` 時，才更新 balance、遞增 version 並將 watermark 設為預先產生的 Transaction ID。
- 條件式更新未選出 row時不得 Insert Ledger。餘額不足保存 Failed Permanent／Insufficient Stored Result；version conflict、stale generation 或 drift 回明確 Conflict／Unavailable Result。
- D1 Ledger 仍是長期 Source of Truth；Projection 是同步 concurrency guard 且可由 Ledger 重建。`consistency_status != 'healthy'` 時停止該 Account 的所有資產異動，先 Reconcile／Rebuild／Verify，再由 Owner Command 恢復。
- Reconciliation 比對 ledger sum、最後 Ledger ID、最大 Account Version、watermark 與 resulting balance；drift 不可改 Ledger，也不可盲目繼續扣點。

## D1-only Atomic Boundary

成功 Point Command 必須在一個 D1 local transaction 內完成：

```text
Validate current Idempotency owner + processing_generation
→ Conditional Projection balance/version/watermark update
→ Insert exactly one Ledger Entry with same version/resulting balance
→ Mark the same Idempotency generation Completed with Stored Result
```

- Account Version Unique、Idempotency Effect Unique、Single Full Reverse Unique 共同提供 DB Winner。為滿足 immediate Composite FK，physical statement可先把同 generation Stored Result轉為 Completed再 Insert Ledger；兩者仍在同一 transaction，Ledger或後續 invariant失敗時Completed update必須一起 rollback。
- 任一 statement error、constraint conflict、stale generation、row-count invariant mismatch 或 Stored Result completion failure都必須 abort／rollback；不得在 commit 後才以 Application compensation 修補 Projection 或 Ledger。
- 初版 D1 Binding 策略明確使用單一 `batch()`：先以 owner＋generation CAS暫存 Completed Result，再條件式更新 Projection，最後 Insert Ledger。`trg_point_transactions_projection_guard` 在 Insert 前要求 Projection 與 `NEW` Ledger 的 Tenant、Account、healthy status、Version、Watermark／Transaction ID 與 Resulting Balance 全部一致；Projection UPDATE 為零筆或任一 snapshot 不符時，以 `RAISE(ABORT, 'point_projection_guard_mismatch')` 讓 Ledger statement 失敗，使 Idempotency、Projection與Ledger整批 rollback。禁止依賴跨 statement affected-row 傳遞，也禁止先 commit再檢查 row count。
- Claim Record 可先以無 Domain Effect 的短 transaction 建立；真正資產提交仍須在上述 transaction 重新驗證 owner＋generation。Unknown Response 只用原 key查 Stored Result／Ledger Reference，不以新 key重扣。
- D1 Sessions 只處理 sequential read consistency，不是 balance lock。Durable Object 只能依 conflict rate、retry rate、write contention、p95／p99 latency 與 hot-account burst evidence 作 optional serialization／load-shedding，不是 correctness dependency。

## Open Decisions

Internal ID generator、scope key 的非權威顯示／查詢格式、Durable Object 啟用門檻、ledger retention／archive 仍需後續批准或證據。Single Full Reverse、同步 Projection Guard 與 D1-only correctness boundary 已由 Gate 3 Review 指定為初版 Proposal，不代表 Implemented 或 Verified。

SQL：[002-point-ledger.sql](schema/proposals/002-point-ledger.sql)。
