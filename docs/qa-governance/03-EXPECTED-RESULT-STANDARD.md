# Expected Result Standard

Expected Result 不得只寫「成功」「失敗」或「應被拒絕」。

## Three-part Assertion

1. **Before State**：相關 row count、status、balance、version、watermark、ledger、idempotency、audit 摘要。
2. **Action**：唯一可識別的 Test Action／Command Reference。

## Normative Field Names

適用時必須逐欄記錄 Expected Exit Code、Expected Error Code、Expected SQLite／D1 Error、Expected Affected Rows、Expected Row Count、Expected Balance、Expected Ledger Count、Expected Projection Version、Expected Watermark、Expected Idempotency Status、Expected Audit Effect、Expected Event Effect、Expected Rollback State、Expected Retry Result、Expected Final State Hash。
3. **After State**：精確資料狀態與可證明的不變量。

適用欄位包括 Expected Exit Code、Error Code、SQLite／D1 Error、Affected Rows、Row Count、Balance、Ledger Count、Projection Version、Watermark、Idempotency Status、Audit Effect、Event Effect、Rollback State、Retry Result、Final State Hash。

不適用欄位必須標示 Not Applicable 並說明理由；不得省略可能影響資產、Tenant Boundary 或重送安全的 assertion。
