# Test Case Standard

每個 Test Case 必須包含：

| Field | Requirement |
| --- | --- |
| Identity | Test ID、Title、Owner Module、Owner、Reviewer、Status |
| Classification | Test Type、Risk Classification |
| Traceability | Source ADR、Source Contract、Source Requirement、Source Commit |
| Execution Context | Environment、Preconditions、Fixture ID、Seed |
| Procedure | Setup、Action、Cleanup、Re-run Rule、Stop Conditions |
| Assertion | Expected Result、Expected Error、Expected Affected Rows、Expected Final State |
| Evidence | Evidence Required |

Test Type 至少包含 Positive、Negative、Boundary、Permission、Tenant Isolation、Concurrency、Replay、Idempotency、Recovery、Reconciliation、Performance、Security、Migration。

Status 僅可為 Planned、Approved、Implemented、Executed、Passed、Failed、Blocked、Invalidated。

`Approved ≠ Implemented`；`Implemented ≠ Executed`；`Executed ≠ Passed`。缺少 traceability、deterministic fixture、精確 assertion、cleanup 或 stop condition 的案例不得 Approved。
