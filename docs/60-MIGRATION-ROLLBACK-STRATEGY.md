# Migration and Rollback Strategy

> Proposal Only · No Migration Executed · No D1 Access

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

## Migration Classes

| Class | Candidate Method | Required Evidence |
| --- | --- | --- |
| Additive | new nullable／default-safe column、new table／index | old runtime compatibility、write cost |
| Backfill | bounded cursor batches with item＋batch idempotency | counts、rejects、resume、rate limit |
| Constraint Tightening | detect violations → quarantine／correct → add constraint | zero unexplained violations |
| Column Replacement | expand new column → dual read candidate → backfill → switch | parity／rollback window |
| Table Split／Merge | copy by stable key＋mapping table／reference | ownership、counts、orphan scan |
| Data Correction | approved case＋before／after reference | audit、reconcile、replay protection |
| Archive | immutable export candidate＋verification＋restricted delete policy | retention／restore evidence |

## Required Sequence

```text
Expand → Migrate → Verify → Switch → Contract
```

- 優先 additive；不得直接 drop 高價值資料。
- Constraint tightening 前先掃描違規資料，不能讓 migration 以 production exception 作 discovery。
- Backfill 使用 stable cursor，不使用深度 OFFSET；每 batch／item 可 resume 且 idempotent。
- 大量 data migration 必須分批並受 target D1 limits／CPU／query duration evidence 控制。
- 每階段都有 stop condition、owner、metrics、audit與 forward plan。

## Rollback Taxonomy

- **Schema rollback**：僅對可逆 additive schema；drop／rename 可能失去資料，不自動執行。
- **Data rollback**：只有可證明 inverse mapping 時使用；ledger／audit 不以 delete rollback。
- **Forward fix**：已產生新正式資料或 constraint 已生效時的預設安全路徑。
- **Feature disable**：停止新 write，不等於復原資料。
- **Dual read／dual write**：只在明確期限、source of truth、conflict rule與 removal plan 下候選使用。

D1 point-in-time recovery 是災難復原能力，不替代 migration design、forward compatibility、reconciliation 或 application rollback。實際 restore window／plan 需在執行前依 account plan 與官方限制重新確認。

## Draft Safety

`docs/schema/migrations/` 是 documentation-only 非 Wrangler path。Draft 沒有 binding、database ID、database name、execute command 或 production data。本 Sprint 不測試 rollback，也不宣稱 migration 可執行。
