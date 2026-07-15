# Recovery／Reconciliation Test Standard

Recovery Test 至少包含 Partial Failure、Batch Rollback、Trigger／Constraint Failure、Backfill／Migration Phase Interrupt、Cleanup／Evidence Capture Failure、Unknown Commit Result、Projection Drift、Orphan Reference、Duplicate Active Row、Missing Audit。

每個 Reconciliation Test 必須定義：

| Field | Requirement |
| --- | --- |
| Detection | deterministic query／comparison concept |
| Severity | Critical／High／Medium／Low |
| Expected Finding Count | exact count or bounded rule |
| Auto Fix Allowed | Yes／No with authority |
| Manual Review | required role |
| Repair Command Concept | owner command；不是任意 SQL |
| Expected Post-repair State | exact invariant |
| Audit／Escalation | evidence and notification |
| Exit Criteria | condition required to close／promote |
| Evidence | before／after、hash、review |

Ledger、Audit、History 不得以 Delete 作一般修復。任何 unknown outcome 在證明前維持 blocked；不得盲目重送高價值 effect。
