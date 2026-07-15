# A01～A06 Negative Test Plan

> 所有案例初始狀態均為 **Not Executed／Not Verified**。以下是未來測試規格，不是測試結果。

## Common Requirements

每個 Run 使用 isolated synthetic fixture；驗證目標必須包含 DB Abort、整批 rollback、Ledger／Projection／Idempotency final state，以及 cleanup evidence。

| Test ID | Purpose | Preconditions | Fixture | Execution Steps | Expected Error | Expected Rollback | Expected Final Tables | Evidence Required | Cleanup | Result Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | Projection Update 0 Row 不得寫入 Ledger | healthy account baseline | ledger 指向不存在或未更新的 projection version | 使 guard update 無 winner，仍提交 ledger effect | projection guard mismatch | projection、ledger、stored result 全部不提交 | 原 projection 不變；無新 ledger；idempotency 非 completed | error、row counts、before／after hash | 移除 synthetic run | Not Executed／Not Verified |
| A02 | Projection Version Mismatch 必須中止 | projection version N | ledger 宣告不同 version | 在同一 atomic boundary 嘗試 effect | projection guard mismatch | batch 全回滾 | version、balance、watermark 不變 | error 與 final-state scan | 移除 fixture | Not Executed／Not Verified |
| A03 | Ledger Watermark Mismatch 必須中止 | known watermark | ledger id 與 projection watermark 不一致 | 嘗試提交 ledger | projection guard mismatch | batch 全回滾 | 無 ledger；watermark 不變 | watermark comparison、error | 移除 fixture | Not Executed／Not Verified |
| A04 | Resulting Balance Mismatch 必須中止 | known balance | signed amount 與 resulting balance 不一致 | 嘗試提交 effect | projection guard mismatch | batch 全回滾 | balance、version、ledger 不變 | calculation、error、table scan | 移除 fixture | Not Executed／Not Verified |
| A05 | Reverse Amount Mismatch 必須中止 | eligible original transaction | reverse amount 非 exact negative | 嘗試 full reverse | reverse guard mismatch | reverse 與 projection 更新回滾 | original 保留；無 reverse | original／candidate comparison、error | 移除 candidate | Not Executed／Not Verified |
| A06 | Reverse of Reverse 必須中止 | original 與既有 reverse fixture | 新 reverse 指向 reverse | 嘗試第二層 reverse | reverse guard mismatch | 新 effect 全回滾 | 原始鏈不變；無新 reverse | chain scan、error、final state | 移除 synthetic fixture | Not Executed／Not Verified |

Pass 只有在 Evidence Registry 連結到可重現 artifact，且 Architecture Reviewer 確認 final-state 與 rollback evidence 後才能登錄。
