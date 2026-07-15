# Test Evidence Registry

> Initial Registry 只有 Planned rows；不得填入虛構測試結果。

| Evidence ID | Test ID | Environment | Repository | Commit SHA | Schema Hash | Migration Hash | Execution Time | Operator | Expected Result | Actual Result | Logs | Screenshots | Database Snapshot Reference | Status | Reviewer | Review Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E-PLAN-A01 | A01 | Local／Isolated | fangwl591021/framework | Pending | Pending | Pending | Not Executed | Unassigned | DB abort and full rollback | Not Executed | Pending | Pending | Pending | Planned | Unassigned | Pending |
| E-PLAN-A02 | A02 | Local／Isolated | fangwl591021/framework | Pending | Pending | Pending | Not Executed | Unassigned | DB abort and full rollback | Not Executed | Pending | Pending | Pending | Planned | Unassigned | Pending |
| E-PLAN-A03 | A03 | Local／Isolated | fangwl591021/framework | Pending | Pending | Pending | Not Executed | Unassigned | DB abort and full rollback | Not Executed | Pending | Pending | Pending | Planned | Unassigned | Pending |
| E-PLAN-A04 | A04 | Local／Isolated | fangwl591021/framework | Pending | Pending | Pending | Not Executed | Unassigned | DB abort and full rollback | Not Executed | Pending | Pending | Pending | Planned | Unassigned | Pending |
| E-PLAN-A05 | A05 | Local／Isolated | fangwl591021/framework | Pending | Pending | Pending | Not Executed | Unassigned | reverse guard abort and rollback | Not Executed | Pending | Pending | Pending | Planned | Unassigned | Pending |
| E-PLAN-A06 | A06 | Local／Isolated | fangwl591021/framework | Pending | Pending | Pending | Not Executed | Unassigned | reverse guard abort and rollback | Not Executed | Pending | Pending | Pending | Planned | Unassigned | Pending |
| E-PLAN-TENANT | Tenant Isolation | Local／Isolated | fangwl591021/framework | Pending | Pending | Pending | Not Executed | Unassigned | cross-tenant reference rejected | Not Executed | Pending | Pending | Pending | Planned | Unassigned | Pending |
| E-PLAN-ATOMIC | Atomicity／Replay | Local／Isolated | fangwl591021/framework | Pending | Pending | Pending | Not Executed | Unassigned | one effect or full rollback | Not Executed | Pending | Pending | Pending | Planned | Unassigned | Pending |
| E-PLAN-RECON | Reconciliation | Isolated | fangwl591021/framework | Pending | Pending | Pending | Not Executed | Unassigned | drift detected and safely stopped | Not Executed | Pending | Pending | Pending | Planned | Unassigned | Pending |

新增實際 Evidence row 時不得覆寫 Planned row；必須保留 failed run、retry relationship、rollback evidence 與 Reviewer 判定。Artifact 不得包含 Secret 或完整 PII。
