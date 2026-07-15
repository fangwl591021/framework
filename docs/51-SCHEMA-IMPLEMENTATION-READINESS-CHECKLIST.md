# Schema Implementation Readiness Checklist

> Gate for a Future Physical D1 Schema Sprint · This Sprint Does Not Implement Schema

任何 Module 在建立 D1 Table、Column、Index、Constraint、Migration 或 Runtime Repository 前，必須逐項完成本 Gate。未完成項目需標示 Owner、Risk、Decision Date 與 Blocking Status。

## 1. Ownership and Boundary

- [ ] 每個 Logical Record 有唯一 Owner Module。
- [ ] Owned Data、Read-only External Data 與 Business Reference 已分開。
- [ ] Tenant／Brand／Shop Scope 與跨 Scope 負面案例已定義。
- [ ] External Identity、Token、URL、顯示名稱未被當作 Business Primary Key。
- [ ] Module Contract、Registry、ADR 與 Logical Model 一致。

## 2. Record and Relationship Design

- [ ] Record Identity、Lifecycle、Original／Correction／Merge Reference 已定義。
- [ ] Required／Optional 關係與孤兒處理已定義。
- [ ] Logical Uniqueness、Conflict 與 Concurrency Winner 已定義。
- [ ] 不使用 Cascade Delete 破壞 Ledger、Audit 或歷史關係。
- [ ] Cross-module Reference 不複製其他 Module Owned Data。

## 3. Transaction Safety

- [ ] Command 的 Atomic Intent、Allowed State、Success／Failure 已定義。
- [ ] Idempotency Key、Fingerprint、Stored Result、Retry、Conflict 與 Retention 已定義。
- [ ] Point Ledger 只保存已成立的 Grant／Deduct／Redeem／Expire／Reverse／Adjust Entry。
- [ ] Insufficient Balance 與其他 Rejected／Failed Point Intent 不建立 Ledger Entry，且有安全 Stored Result。
- [ ] Completed／Reversed Transaction 與 Rejected／Failed Attempt 使用不同 Logical Record、Status 與 Query Path。
- [ ] Point Balance 只由有效 Ledger Entry 推導；失敗嘗試不參與 Projection。
- [ ] 同步 Projection Guard、Ledger Insert、Account Version 與 Idempotency Completed Result具有單一 D1 Local Transaction Boundary。
- [ ] 同一 Tenant Idempotency Record最多一筆 Point Ledger Effect；Processing Lease有generation fencing。
- [ ] Single Full Reverse由Unique Guard與同 transaction application validation限制；Partial Reverse未批准。
- [ ] Projection Drift會停止Point Effect，且只允許由Ledger重建Projection。
- [ ] Audit／Application／Security Log 只保存用途所需摘要，不複製完整 Transaction 或 Payload。
- [ ] Reverse／Correct／Adjust／Merge／Anonymize 路徑已定義。
- [ ] 跨 Module Failure 使用 Reconciliation／Compensation，不假設分散式 Transaction。
- [ ] Point Balance、Attendance、Redemption 等高價值結果不依賴 KV 作唯一真相。

## 4. Access and Performance Evidence

- [ ] 寫入與查詢 Access Pattern 有 Owner、頻率、Scope、排序與分頁需求。
- [ ] 容量、成長、Hot Key／Hot Account、競爭與 Transaction 範圍已估算。
- [ ] Index Candidate 由 Query Evidence 驅動，不因方便而建立。
- [ ] Projection／Cache 可重建，且有 Freshness、Invalidation 與 Reconciliation。
- [ ] D1 限制與量測結果已記錄；未以理論宣稱 Production Ready。

## 5. Security and Privacy

- [ ] PII／Restricted／Financial-like／Audit Classification 已完成。
- [ ] 最小保存、遮罩、Encryption、Access、Export 與 Audit Policy 已核准。
- [ ] Retention、Erasure、Anonymization、Archive 與 Legal Hold 已定義。
- [ ] Secret、Provider Token、完整 Payload 不進核心 Record 或 Log。
- [ ] Permission Denied 與 Not Found 不洩漏其他 Tenant 資料存在性。

## 6. Migration and Operations

- [ ] Source Inventory、Mapping、Reject／Quarantine、Backfill 與 Reconciliation 已設計。
- [ ] Migration Batch／Item Idempotency 與 Resume Strategy 已定義。
- [ ] Rollback、Forward Fix、Dual-read／Dual-write 風險已評估。
- [ ] Backup、Restore、Disaster Recovery 與資料驗證方式已決定。
- [ ] Metrics、Alert、Audit Search、Runbook 與 Incident Owner 已定義。

## 7. Approval Gate

- [ ] Physical Schema Proposal 明確標示與 Logical Model 的差異。
- [ ] Breaking Boundary 或 Storage Decision 已建立 ADR。
- [ ] Domain Owner、Security／Privacy Reviewer、Platform Architect 已審查。
- [ ] Architecture Owner Tony 已批准必要 ADR 與 Breaking Change。
- [ ] Implementation Status 仍維持 Not Implemented，直到程式與 Migration 實際完成。
- [ ] Production Verification 仍維持 Not Verified，直到指定環境有可重現證據。

## Sprint 7 Proposal Links

- [Physical D1 Schema Overview](52-PHYSICAL-D1-SCHEMA-OVERVIEW.md)
- [Identity and Membership Physical Schema](53-IDENTITY-MEMBERSHIP-PHYSICAL-SCHEMA.md)
- [Point Ledger Physical Schema](54-POINT-LEDGER-PHYSICAL-SCHEMA.md)
- [Referral and Attribution Physical Schema](55-REFERRAL-ATTRIBUTION-PHYSICAL-SCHEMA.md)
- [Attendance and Redemption Physical Schema](56-ATTENDANCE-REDEMPTION-PHYSICAL-SCHEMA.md)
- [Audit and Idempotency Physical Schema](57-AUDIT-IDEMPOTENCY-PHYSICAL-SCHEMA.md)
- [Index and Query Evidence](58-INDEX-QUERY-EVIDENCE.md)
- [Transaction Boundary Proposal](59-TRANSACTION-BOUNDARY-PROPOSAL.md)
- [Migration and Rollback Strategy](60-MIGRATION-ROLLBACK-STRATEGY.md)
- [Reconciliation and Backfill Strategy](61-RECONCILIATION-BACKFILL-STRATEGY.md)
- [D1 Capacity and Retention Plan](62-D1-CAPACITY-RETENTION-PLAN.md)
- [Physical Schema Review Checklist](63-PHYSICAL-SCHEMA-REVIEW-CHECKLIST.md)

## Sprint 7 Architecture Review Status

- [x] Gate 1 — Cross-Tenant Foreign Key：PASS。
- [x] Gate 2 — Active-only Uniqueness：PASS。
- [x] Gate 3 — Point Ledger Concurrency：PASS。
- [x] Main Sync 後完整差異回歸已完成並由最終 Architecture Review 接受。
- [ ] Schema／Migration 已取得執行批准。

Gate PASS 只批准 Proposal Architecture Boundary；PR #6 已合併，但 Schema／Migration 仍為 Not Executed／Not Verified，且未取得 Execution Approval。

所有 Proposal／Checklist 項目仍需審查，不因文件存在而視為完成。

## Sprint 6 Exit Statement

Sprint 6 只在 Logical Model、Integrity Matrix、Retention Questions 與 Readiness Gate 完整且互相一致時完成。完成 Sprint 6 不等於 Schema Approved、Migration Ready、Runtime Implemented 或 Production Verified。

相關文件：[D1 Logical Data Model](44-D1-LOGICAL-DATA-MODEL.md)、[Data Integrity and Retention Matrix](50-DATA-INTEGRITY-RETENTION-MATRIX.md)、[Project Checklist](09-PROJECT-CHECKLIST.md)。

## Approved Migration Package Handoff

Physical Schema Proposal 已在 RC1 baseline 通過 Architecture Review Gates 1～3，但仍是 Not Executed／Not Verified。後續只能依 [Approved Migration Package](migration-package/README.md) 進入獨立 Test Design Review。

- [ ] Package Designed 已核准。
- [ ] Test Plan Approved。
- [ ] Local D1 Tested。
- [ ] Isolated D1 Tested。
- [ ] Architecture Approved for Migration Package。
- [ ] Security Approved。
- [ ] Execution Approved。
- [ ] Migration Executed。
- [ ] Post-Migration Verified。

目前全部不得由 Gate 1～3 的 PASS 推導；執行狀態維持 NO-GO。
