# Physical Schema Review Checklist

> Architecture Owner Gate · Review Results Recorded Explicitly

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

## Gate 1 — Cross-Tenant Foreign Key

- [ ] Membership Merge 使用 Tenant-aware Composite FK；cross-tenant target 與 self target 有 negative evidence。
- [ ] Merge chain no-cycle、same Platform User／approved Identity Merge、merged subject inactive 有 Membership Engine owner 與 negative test。
- [ ] Core Template 與 Tenant-defined Role 使用明確 normalized scope；合法 scope CHECK 已審查。
- [ ] Role、Mapping、Assignment 使用 Composite FK 保證相同 Core／Tenant scope。
- [ ] Platform Assignment 只能引用 Core Template；Tenant／Brand／Shop Assignment 不能引用其他 Tenant Role。
- [ ] Polymorphic subject reference 明確列為 application-only invariant，不宣稱 FK 完整覆蓋。
- [ ] Platform／Tenant Idempotency 的 CHECK 與唯一性空間分離。
- [ ] Tenant Domain → Idempotency 使用 Tenant-aware Composite FK，不能引用 Platform 或其他 Tenant Record。
- [ ] Audit 的 Platform／Tenant／Brand／Shop 合法 nullable 組合、Tenant FK 與 optional Brand–Shop hierarchy 已審查。
- [ ] Attendance 的 Event／Session／Source Attempt hierarchy 使用同一 Composite FK path。
- [ ] 所有 nullable Composite FK 均有必要 CHECK、獨立 parent FK 或明確 application invariant。
- [x] Gate 1 第二輪 Architecture Owner Review PASS 已記錄；此狀態不批准 Schema，PR 仍維持 Draft／Not Approved。

## Gate 2 — Active-only Uniqueness

- [ ] Active-only Domain Record 全部使用 status-based Partial Unique Index，不再使用 `active_marker`。
- [ ] Identity Mapping、Tenant Membership、Shop Membership 的 effective key 全為 NOT NULL 且由 Partial Unique Index選出 Winner。
- [ ] Role Assignment 使用非 NULL canonical `assignment_scope_key`；nullable Brand／Shop 不直接參與一般 Active UNIQUE。
- [ ] Point Account 依 `shop_id IS NULL／IS NOT NULL` 使用兩個 Partial Unique Index；`scope_key` 不是唯一性真相。
- [ ] Referral、Attribution、Attendance 的 effective status predicate 與 Contract 語意一致。
- [ ] Create Active 直接 Insert，由 Unique Conflict 決定 Winner，不採 check-then-insert。
- [ ] Replace／Correct 在單一 local transaction 關閉舊 Winner並建立新 Winner；任一步驟失敗整筆 rollback。
- [ ] Revoke 明確允許 zero-active，且不與 Replace／Correct 混用。
- [ ] Historical row 不可直接恢復為 effective；若 Contract 允許恢復，仍建立新版本並走唯一 Winner 流程。
- [ ] Concurrent conflict 有 Stored Result、Retry Policy、Audit、Idempotency 與 Reconciliation owner。
- [ ] Drift detection 覆蓋 active count `> 1`、非預期 `0`、scope-key mismatch 與非法 lifecycle transition。
- [x] Gate 2 第二輪 Architecture Owner Review PASS 已記錄；此狀態不批准 Schema，PR 仍維持 Draft／Not Approved。

## Gate 3 — Point Ledger Concurrency

- [ ] 每個 Point Account 建立唯一同步 Projection Guard，初始 balance／version／watermark／consistency status明確。
- [ ] Deduct／Redeem／Expire／負 Adjust 使用 non-negative balance＋expected version＋healthy status條件式更新，併發時只有合法 Winner。
- [ ] Projection Guard、Ledger Insert、Account Version、Idempotency Completed Result在單一 D1 local transaction提交；任一步驟失敗整體 rollback。
- [ ] `trg_point_transactions_projection_guard` 能把 Projection zero-row／Tenant／Account／healthy／Version／Watermark／Balance mismatch轉成 DB abort，不能依賴跨 statement row count或commit後補償。
- [ ] 同一 Tenant Idempotency Record最多一筆 Point Ledger Effect，且 Ledger綁定目前 generation與 Completed Status。
- [ ] Claim／Retry／Takeover使用 generation fencing與 CAS；stale owner不能提交 terminal result或 Domain Effect。
- [ ] Same Key replay、Different Fingerprint、Response Lost、Unknown Outcome與 Retry規則已審查。
- [ ] 初版採 Single Full Reverse；Unique Index限制同 Original最多一筆，`trg_point_transactions_reverse_guard` DB驗證同 Tenant／Account、金額精確相反且Reverse不得再Reverse，Partial Reverse不支援。
- [ ] Projection Drift會阻止 Point Effect；rebuild只改 Projection，不改 Ledger，Owner Verify後才能恢復 healthy。
- [ ] Durable Object只有在 conflict／retry／contention／latency／burst evidence後作 optional optimization，不是 correctness dependency。
- [ ] Gate 3 故障矩陣覆蓋雙併發、lease takeover、stale owner、partial failure、reverse replay、drift與hot account。
- [ ] A01–A06 Negative Evidence覆蓋Projection zero-row／Version／Watermark／Balance mismatch與Reverse amount／reverse-of-reverse，且每案取得DB abort與整批rollback證據。
- [x] Gate 3 最終 Architecture Owner Review PASS 已記錄；此狀態只批准 Proposal Architecture Boundary，PR仍維持Draft／Not Executed／Not Verified，尚未批准執行。

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
