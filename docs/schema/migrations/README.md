# Migration Drafts

> Documentation Only · Do Not Execute

This directory is documentation only. Wrangler must not execute these files.

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

`0001-initial-schema.draft.sql` 是五份 SQL Proposal 的整體審查快照，不是 Approved Migration。此目錄刻意位於 `docs/schema/migrations/`，不是 Repository 根目錄的 Wrangler 預設 `migrations/`。

禁止：

- 使用 Wrangler、SQLite、D1 Console、API 或任何工具執行本目錄 SQL。
- 加入 D1 binding、database name、database ID、account ID 或 execute command。
- 將 `.draft.sql` 複製到 runtime migration path 而未完成 Architecture／Security／Migration Review。
- 宣稱 migration 已測試、可 rollback、performance verified 或 production ready。

正式 Migration Package 必須在 Sprint 8 完成 Review Corrections、target D1 compatibility check、query plan、constraint、migration／rollback／reconciliation review 後另案建立。
