# A01～A06 Negative Test Plan

> 所有案例初始狀態均為 **Not Executed／Not Verified**。以下是未來測試規格，不是測試結果。

## Common Requirements

每個 Run 使用 isolated synthetic fixture；驗證目標必須包含 DB Abort、整批 rollback、Ledger／Projection／Idempotency final state，以及 cleanup evidence。

| Test ID | Purpose / fixed baseline | Action | Expected error / affected rows | Exact final-state assertion | Evidence / re-run | Result Status |
| --- | --- | --- | --- | --- | --- | --- |
| A01 | one synthetic account projection; balance 100, version 7, watermark `L-007`; candidate ledger count 0 and candidate idempotency count 0 | submit an effect whose projection update matches zero rows | trigger abort class `projection guard mismatch`; committed affected rows: 0 | projection remains 100 / 7 / `L-007`; candidate ledger count 0; candidate idempotency count 0; audit count for candidate 0 | capture before/after counts and hashes; cleanup only approved prefix; retry uses new Run ID and identical fixture hash | Not Executed／Not Verified |
| A02 | same baseline as A01 | submit version 8 against projection version 7 | `projection guard mismatch`; committed affected rows: 0 | projection remains 100 / 7 / `L-007`; candidate ledger, idempotency and audit counts each 0 | capture trigger/error reference and state digest; new Run ID for retry | Not Executed／Not Verified |
| A03 | same baseline as A01 | submit ledger whose predecessor/watermark does not equal `L-007` | `projection guard mismatch`; committed affected rows: 0 | projection remains 100 / 7 / `L-007`; candidate ledger, idempotency and audit counts each 0 | capture watermark comparison and state digest; new Run ID for retry | Not Executed／Not Verified |
| A04 | same baseline as A01 | submit signed amount/resulting balance pair inconsistent with 100 | `projection guard mismatch`; committed affected rows: 0 | projection remains 100 / 7 / `L-007`; candidate ledger, idempotency and audit counts each 0 | capture calculation and state digest; new Run ID for retry | Not Executed／Not Verified |
| A05 | synthetic eligible original effect amount +25; candidate reverse count 0; projection has matching post-original state | submit reverse amount other than -25 | `reverse guard mismatch`; committed affected rows: 0 | original remains terminal and unreversed; reverse count 0; projection/version/watermark unchanged; candidate idempotency/audit counts 0 | capture original/candidate comparison and state digest; new Run ID for retry | Not Executed／Not Verified |
| A06 | synthetic original +25 with one existing valid reverse -25; second candidate reverse count 0 | submit a reverse whose original points to the existing reverse | `reverse guard mismatch`; committed affected rows: 0 | two existing chain rows unchanged; second candidate reverse count 0; projection/version/watermark unchanged; candidate idempotency/audit counts 0 | capture chain scan and state digest; new Run ID for retry | Not Executed／Not Verified |

Pass 只有在 Evidence Registry 連結到可重現 artifact，且 Architecture Reviewer 確認 final-state 與 rollback evidence 後才能登錄。
