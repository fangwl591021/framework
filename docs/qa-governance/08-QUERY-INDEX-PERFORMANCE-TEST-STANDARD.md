# Query／Index／Performance Test Standard

> Test design only. No performance test executed.

| Field | Requirement |
| --- | --- |
| Query Identity | Query ID、Module、Requirement |
| Dataset | Dataset Size、Tenant Cardinality、Fixture Version |
| Query Shape | Filter、Sort、Pagination／Cursor |
| Index | Expected Index、Composite Order、Index Size |
| Plan | Expected Query Plan、Actual Query Plan、Rows Scanned |
| Cost | Latency、Write Cost、Regression Threshold |
| Governance | Environment、Evidence、Reviewer、Status |

環境必須區分 Fresh、Small Seeded、Medium Seeded、Large Synthetic、Hot Tenant、Hot Account。需驗證 Tenant Filter、cursor、index adoption 與 write-heavy table 成本。

- Performance Test Standard：Proposed
- Performance Tested：No

Actual 欄位在執行前保持 Not Executed；不得用理論值宣稱 Passed。
