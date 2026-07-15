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
| Point Ledger vs Projection | ledger sum／last ID／max account version／resulting balance ≠ projection balance／watermark／version | Critical | mark `drifted` and block Point Effect；rebuild projection only | ledger mutation forbidden；verify before `healthy` | bounded retry／Point Engine |
| Identity Mapping active uniqueness | provider context＋subject active count > 1 | Critical | No | identity conflict review | case retry／Identity Center |
| Tenant Membership active uniqueness | tenant＋user active count > 1 | Critical | No | membership lifecycle review | case retry／Membership Engine |
| Shop Membership active uniqueness | tenant＋membership＋shop active count > 1 | High | No | membership lifecycle review | case retry／Membership Engine |
| Role Assignment active uniqueness | subject＋role＋assignment scope active count > 1／scope key mismatch | Critical | No | permission incident／audit | no retry／Permission Engine |
| Point Account active uniqueness | tenant／shop scope active count > 1 or program mode mismatch | Critical | No | asset ownership review | no retry／Point Engine |
| Active replacement outcome | Replace／Correct committed with non-expected zero active | Critical | No blind reactivation | inspect transaction／idempotency／audit evidence | same key／Owner Module |
| Referral active uniqueness | member active count > 1 | High | No | choose valid history with approval | case retry／Referral Engine |
| Attribution active record | conversion active count > 1 | High | No | policy evidence review | case retry／Attribution Engine |
| Attendance duplicate | session＋member active count > 1 | High | No | revoke／correct approved record | case retry／Attendance Engine |
| Redemption vs Point | completed result missing／mismatched point reference | Critical | query Stored Result only | finance review／compensation | same key／Redemption＋Point |
| Idempotency vs Domain | completed Stored Result missing domain result | Critical | No blind replay | determine unknown outcome | same key／Owner Module |
| Point Idempotency Effect | one tenant idempotency record links >1 ledger effect／generation or completed status mismatch | Critical | Never automatic | freeze account guard；inspect claim／ledger／result | no retry／Point＋Platform Core |
| Stale Processing Owner | terminal write or ledger effect references non-current generation | Critical | Never automatic | security incident；owner／generation timeline | no retry／Platform Core |
| Point Account Version | duplicate／gap／non-monotonic ledger projection_version or resulting balance mismatch | Critical | mark `drifted`；rebuild projection only after review | ledger remains immutable | bounded／Point Engine |
| Single Full Reverse | original has >1 reverse、reverse-of-reverse or amount not exact opposite | Critical | Never automatic | finance approval／incident／Adjust or forward correction | no retry／Point Engine |
| Unknown Point Outcome | processing／retryable record with ambiguous ledger／projection evidence | Critical | query only；no blind replay | classify committed／not committed／manual review | same key／Point Engine |
| Hot Account | conflict／retry／contention／p95／p99 or burst exceeds approved threshold | High | optional routing／load shedding only | D1 correctness remains mandatory | bounded／Platform Operations |
| Audit missing reference | high-risk change without audit reference | High | append verified minimal audit candidate | security review | bounded／Audit Owner |
| Cross-tenant scope | child tenant differs from parent | Critical | Never automatic | quarantine／incident／approval | no retry／Security＋Owner |
| Membership merge scope | target tenant differs／self／cycle／ineligible target | Critical | Never automatic | Identity／Membership approval | no retry／Membership Engine |
| Role scope integrity | role、mapping、assignment scope key mismatch | Critical | Never automatic | Permission incident／policy review | no retry／Permission Engine |
| Idempotency scope integrity | Tenant Domain result points to platform／other Tenant record | Critical | Never automatic | quarantine command and domain result | no retry／Owner＋Security |
| Audit hierarchy | illegal nullable scope／Brand／Shop mismatch | High | Never automatic | classify correct scope with evidence | case retry／Audit Owner |
| Event session hierarchy | attendance event differs from referenced session／attempt | High | Never automatic | Attendance correction／quarantine | case retry／Attendance Engine |
| Orphan FK | reference parent absent | High | No | migration source review | batch retry／Data Owner |
| Merge chain integrity | cycle／missing terminal identity | Critical | No | Identity Reviewer approval | case retry／Identity Center |

## Point Drift Recovery Protocol

1. Atomic transaction或 reconciliation偵測任何 Ledger／Projection／Idempotency invariant mismatch時，將 Projection `consistency_status` 轉為 `drifted`，停止該 Account 的所有資產異動。
2. 以 Ledger 順序重算 balance、max projection version、last transaction ID 與每筆 resulting balance；Failed Intent 不參與。
3. 比對 Idempotency generation、Completed Result Reference、Account Version Unique 與 Single Full Reverse Guard；任何多重效果或不合法 Reverse 都進人工財務審查。
4. 只有在 counts、sum、watermark、version、idempotency reference 全部一致後，Owner Command才可寫入重建 Projection並轉回 `healthy`；不得修改 Ledger來配合 Projection。
5. Response lost／Unknown Outcome 必須先用原 key與 immutable references判定，無法判定時維持 blocked，不自動重送新 Intent。

## Backfill Protocol

1. Freeze mapping／policy version and source snapshot reference.
2. Scan and classify accepted、rejected、quarantined rows without PII output.
3. Process stable key cursor batches; each batch and item has idempotency reference.
4. Save counts、checksum／aggregate candidate、last cursor、failure category.
5. Resume only with same mapping version; changed mapping starts a new run.
6. Reconcile target counts、relationships、scope、sampled semantic evidence.
7. Switch reads only after acceptance criteria；retain rollback／forward-fix window.

## Repair Boundaries

本文件不建立 executable query 或 repair script。Auto fix 只允許在 Account 已停止資產異動、Ledger／Idempotency evidence 完整且驗證通過後重建 projection／cache；Ledger、Idempotency terminal result、Reverse、Referral、Attribution、Attendance、Redemption、Identity Merge 與 cross-tenant violation不得由 repair job改寫，必須走 owner command、audit與必要 approval。

Active-only violation 不得由 repair job 任意挑選 Winner 或把 historical row 直接改回 effective status。Repair queue 只保存 violation reference、scope、detected count、candidate records 與 evidence；最後修正必須走 Owner Module 的 Correct／Replace／Revoke Command、Idempotency、Audit 與必要人工核准。
