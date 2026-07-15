# Architecture／Security／Execution Gates

三個 Gate 彼此獨立，不得相互推導；Physical Schema Gate PASS 也不等於 Migration Execution Approved。

## Architecture Gate

- Logical-to-physical mapping 完整。
- Composite FK 與 Tenant isolation 有正負向證據。
- Active-only uniqueness 與 role／account scope 有唯一 Winner。
- Trigger、constraint、idempotency effect 與 account version 有可驗證 guard。
- Transaction boundary、rollback、forward fix、reconciliation 完整。
- A01～A06 與 concurrency／replay cases 有核准結果。

## Security Gate

- Tenant isolation、Permission、PII classification、Secret exclusion 已審查。
- Audit 不複製完整 Transaction 或 Payload。
- Replay／stale generation／export／retention threat 有控制與證據。
- Test fixture 只含 synthetic data，artifact access 與 retention 已核准。
- Incident、account freeze、traffic stop 與 disclosure path 已建立。

## Execution Approval Gate

- Target environment、backup／restore、operator、runbook、window、monitoring 已確認。
- Source commit、schema hash、package version 與 evidence registry 完全一致。
- Rollback authority、stop condition、business approval 與 post-migration verification 已指派。
- Production 不得由 Staging 或 CI 自動 Promote。

## Authority Matrix

| action | Architecture Owner | Security Reviewer | Migration Operator | Product Owner |
| --- | --- | --- | --- | --- |
| Merge Package Design | 必須 | 選用 | 否 | 選用 |
| Approve Test Plan | 必須 | 必須 | 選用 | 否 |
| Run Local D1 Test | 必須 | 否 | 必須 | 否 |
| Run Isolated D1 Test | 必須 | 必須 | 必須 | 否 |
| Approve Staging Migration | 必須 | 必須 | 必須 | 選用 |
| Approve Production Migration | 必須 | 必須 | 必須 | 必須 |
| Execute Rollback | 必須 | 必須 | 必須 | 依影響 |
| Emergency Stop | 可執行 | 可執行 | 可執行 | 可要求 |

Tony 預設只擔任 Architecture Owner；不因該角色自動成為 Security Reviewer、Migration Operator、Execution Approver 或 Product Owner。
