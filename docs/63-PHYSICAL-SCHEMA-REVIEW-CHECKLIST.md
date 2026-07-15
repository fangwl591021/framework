# Physical Schema Review Checklist

> Architecture Owner Gate · All Items Initially Unchecked

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

## Model and Ownership

- [ ] 每張 Table 映射已批准 Logical Record 或明確 Minimal Reference Boundary。
- [ ] Owner Module、Source of Truth、Read-only External Data 已標明。
- [ ] `events`／`event_sessions`／`conversions` 未擅自接管外部 Domain。
- [ ] Platform User、Membership、Referral、Attribution、Audit 保持分離。

## Keys, Scope and Constraints

- [ ] Internal ID generator 已由 ADR 決定，且不可猜測、不使用 PII／Provider UID。
- [ ] 所有 Tenant Domain Table 直接保存 `tenant_id`。
- [ ] PK、FK、composite tenant FK、Unique、CHECK 逐表審查。
- [ ] Active-only uniqueness strategy 已用 concurrency／repair evidence 驗證。
- [ ] Application-only invariant 有 owner、transaction point與negative test。
- [ ] Time 使用 UTC，Tenant local time 只作計算／顯示。

## Index and Query Evidence

- [ ] 每個 Index Candidate 對應 Query ID。
- [ ] Composite order、cursor pagination、covering need 有 query plan evidence。
- [ ] High-write tables 的 index write cost 已量測。
- [ ] Retention／archive 對 cardinality與index size 已評估。
- [ ] 不為每個欄位無差別建立 index。

## Transaction and History Safety

- [ ] Identity、Membership、Point、Referral、Attribution、Attendance、Redemption boundary 已審查。
- [ ] Idempotency claim、Stored Result、retry、conflict、retention 已審查。
- [ ] Audit 保存最小摘要，不複製 Domain record／payload／secret。
- [ ] Point Ledger 只含正式 Entry；failed intent no row；Balance 可重建。
- [ ] Reverse／Correction／Merge chain 不 hard delete history。
- [ ] Cross-module／cross-database failure 不被宣稱 atomic。

## Migration and Operations

- [ ] Expand–Migrate–Verify–Switch–Contract 有逐階段 exit criteria。
- [ ] Backfill 可 resume、idempotent、bounded 且有 reject／quarantine。
- [ ] Constraint tightening 前有 violation scan。
- [ ] Schema rollback、data rollback、forward fix、feature disable 分開。
- [ ] Reconciliation、orphan、scope drift、merge chain 檢查有 owner。
- [ ] D1 limits、backup／restore、capacity、retention、archive 已依目標環境確認。
- [ ] Security／Privacy Review 與 Architecture Owner Approval 已取得。

## Non-completion Statement

完成 Sprint 7 不代表：

```text
Schema Approved
Migration Executed
Runtime Implemented
Production Verified
```

SQL 仍是 Proposal Only／Do Not Execute。未完成 Checklist 不得建立 Approved Migration Package。
