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

## Sprint 6 Exit Statement

Sprint 6 只在 Logical Model、Integrity Matrix、Retention Questions 與 Readiness Gate 完整且互相一致時完成。完成 Sprint 6 不等於 Schema Approved、Migration Ready、Runtime Implemented 或 Production Verified。

相關文件：[D1 Logical Data Model](44-D1-LOGICAL-DATA-MODEL.md)、[Data Integrity and Retention Matrix](50-DATA-INTEGRITY-RETENTION-MATRIX.md)、[Project Checklist](09-PROJECT-CHECKLIST.md)。
