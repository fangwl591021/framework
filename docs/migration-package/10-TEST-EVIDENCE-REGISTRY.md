# Test Evidence Registry

> Planned records only; do not enter fictional actual results. The complete record schema below is mandatory for every future run.

| Evidence ID | Test ID | Run ID | Environment / Target | Source / Schema / Migration Hash | Fixture / Seed | Start / End | Exit Code | Command Ref | Expected Result | Actual Result | Before / After State | Sanitized Logs | Snapshot / Plan / Screenshot Ref | Result | Retention Class | Operator | Reviewer / Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E-PLAN-A01 | A01 | Pending | Local／Isolated Pending | Pending | Pending | Not Executed | Pending | Pending | guard abort; zero committed changes | Not Executed | Pending | Pending | Pending | Planned | Pending | Unassigned | Unassigned / Pending |
| E-PLAN-A02 | A02 | Pending | Local／Isolated Pending | Pending | Pending | Not Executed | Pending | Pending | guard abort; zero committed changes | Not Executed | Pending | Pending | Pending | Planned | Pending | Unassigned | Unassigned / Pending |
| E-PLAN-A03 | A03 | Pending | Local／Isolated Pending | Pending | Pending | Not Executed | Pending | Pending | guard abort; zero committed changes | Not Executed | Pending | Pending | Pending | Planned | Pending | Unassigned | Unassigned / Pending |
| E-PLAN-A04 | A04 | Pending | Local／Isolated Pending | Pending | Pending | Not Executed | Pending | Pending | guard abort; zero committed changes | Not Executed | Pending | Pending | Pending | Planned | Pending | Unassigned | Unassigned / Pending |
| E-PLAN-A05 | A05 | Pending | Local／Isolated Pending | Pending | Pending | Not Executed | Pending | Pending | reverse abort; zero committed changes | Not Executed | Pending | Pending | Pending | Planned | Pending | Unassigned | Unassigned / Pending |
| E-PLAN-A06 | A06 | Pending | Local／Isolated Pending | Pending | Pending | Not Executed | Pending | Pending | reverse abort; zero committed changes | Not Executed | Pending | Pending | Pending | Planned | Pending | Unassigned | Unassigned / Pending |
| E-PLAN-CATALOG | TBL-01…29 / REG / Q | Pending | Pending | Pending | Pending | Not Executed | Pending | Pending | per catalog case | Not Executed | Pending | Pending | Pending | Planned | Pending | Unassigned | Unassigned / Pending |

新增實際 Evidence row 時不得覆寫 Planned row；必須保留 failed run、retry relationship、rollback evidence 與 Reviewer 判定。Artifact 不得包含 Secret 或完整 PII。
