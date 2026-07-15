# Environment Promotion Policy

## Stage Gates

| Stage | Entry Criteria | Exit Criteria | Evidence | Owner | Approval | Rollback／Data Restrictions |
| --- | --- | --- | --- | --- | --- | --- |
| Design | RC1 baseline、三 Architecture Review Gate PASS | Package 文件完整且 reviewable | diff、links、status matrix | Package Owner | Architecture Owner merge approval | 不得執行；無資料 |
| Local | Test Plan Approved | deterministic tests 有完整結果 | local run registry | Migration Operator | Architecture Owner | synthetic only；可丟棄 local state |
| Isolated | Local PASS、Security fixture review | fresh／seeded isolated tests PASS | isolated artifacts、hashes | Migration Operator | Architecture＋Security | synthetic only；與正式資源完全隔離 |
| Integration | Isolated PASS、contract harness ready | module boundary／fault tests PASS | integration report | Engineering Owner | Architecture＋Security | non-production synthetic only |
| Staging | Integration PASS、runbook／monitoring ready | migration rehearsal、rollback／reconciliation verified | staging evidence | Migration Operator | Architecture＋Security＋Operator；Product 選用 | approved non-production data；不可連正式資料 |
| Production | 所有前段 PASS、Execution Approval、Product Approval | post-migration verification 與 reconciliation PASS | immutable execution record | Migration Operator | 四角色依 Authority Matrix | 永不自動 Promote；獨立 stop／rollback authority |

## Promotion Rules

- 每一 Stage 都需新的 Entry Review，不得用前一環境的 PASS 推導下一環境。
- Artifact 必須綁定 commit SHA、schema hash、fixture hash 與 Run ID。
- Environment identifier 不寫入本設計 Package；執行時放入受控操作紀錄。
- Production Promotion 永不由 Merge、CI、Tag、Release 或 Staging success 自動觸發。
