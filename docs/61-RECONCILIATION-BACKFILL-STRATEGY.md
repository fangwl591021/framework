# Reconciliation and Backfill Strategy

> Proposal Only · Detection Concepts, Not Repair Scripts

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

## Reconciliation Matrix

| Subject | Detection Query Concept | Severity | Auto Fix | Manual Review／Audit | Retry／Owner |
| --- | --- | --- | --- | --- | --- |
| Point Ledger vs Projection | account ledger sum／watermark ≠ projection | Critical | rebuild projection only | ledger mutation forbidden；audit drift | bounded retry／Point Engine |
| Referral active uniqueness | member active count > 1 | High | No | choose valid history with approval | case retry／Referral Engine |
| Attribution active record | conversion active count > 1 | High | No | policy evidence review | case retry／Attribution Engine |
| Attendance duplicate | session＋member active count > 1 | High | No | revoke／correct approved record | case retry／Attendance Engine |
| Redemption vs Point | completed result missing／mismatched point reference | Critical | query Stored Result only | finance review／compensation | same key／Redemption＋Point |
| Idempotency vs Domain | completed Stored Result missing domain result | Critical | No blind replay | determine unknown outcome | same key／Owner Module |
| Audit missing reference | high-risk change without audit reference | High | append verified minimal audit candidate | security review | bounded／Audit Owner |
| Cross-tenant scope | child tenant differs from parent | Critical | Never automatic | quarantine／incident／approval | no retry／Security＋Owner |
| Membership merge scope | target tenant differs／self／cycle／ineligible target | Critical | Never automatic | Identity／Membership approval | no retry／Membership Engine |
| Role scope integrity | role、mapping、assignment scope key mismatch | Critical | Never automatic | Permission incident／policy review | no retry／Permission Engine |
| Idempotency scope integrity | Tenant Domain result points to platform／other Tenant record | Critical | Never automatic | quarantine command and domain result | no retry／Owner＋Security |
| Audit hierarchy | illegal nullable scope／Brand／Shop mismatch | High | Never automatic | classify correct scope with evidence | case retry／Audit Owner |
| Event session hierarchy | attendance event differs from referenced session／attempt | High | Never automatic | Attendance correction／quarantine | case retry／Attendance Engine |
| Orphan FK | reference parent absent | High | No | migration source review | batch retry／Data Owner |
| Merge chain integrity | cycle／missing terminal identity | Critical | No | Identity Reviewer approval | case retry／Identity Center |

## Backfill Protocol

1. Freeze mapping／policy version and source snapshot reference.
2. Scan and classify accepted、rejected、quarantined rows without PII output.
3. Process stable key cursor batches; each batch and item has idempotency reference.
4. Save counts、checksum／aggregate candidate、last cursor、failure category.
5. Resume only with same mapping version; changed mapping starts a new run.
6. Reconcile target counts、relationships、scope、sampled semantic evidence.
7. Switch reads only after acceptance criteria；retain rollback／forward-fix window.

## Repair Boundaries

本文件不建立 executable query 或 repair script。Auto fix 只允許可重建 projection／cache；Ledger、Referral、Attribution、Attendance、Redemption、Identity Merge 與 cross-tenant violation 必須走 owner command、audit與必要 approval。
