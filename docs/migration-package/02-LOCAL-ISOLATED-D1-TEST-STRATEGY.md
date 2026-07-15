# Local／Isolated D1 Test Strategy

> Future test design only。本 Sprint 不建立、不存取、不執行任何 D1 或 Migration。

## Promotion Sequence

SQLite Syntax Review → Local D1 → Fresh Isolated D1 → Seeded Isolated D1 → Integration Environment → Staging → Production。

Cloudflare 官方文件指出 Local D1 與 remote data 預設分離；D1 batch 中任一 statement 發生錯誤時，整個 batch 會 abort／rollback。D1 migration 則是受版本順序管理的 SQL 檔案。這些平台語意仍必須由本 Framework 的 Local／Isolated Evidence 驗證，不能只引用文件推定通過：

- [Cloudflare D1 Local Development](https://developers.cloudflare.com/d1/best-practices/local-development/)
- [Cloudflare D1 Database batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)
- [Cloudflare D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/)

## Test Data Design

- 僅使用 deterministic synthetic identifiers 與虛構資料。
- 禁止真實姓名、電話、Email、Provider UID、Token、Tenant 或交易資料。
- Run naming 使用非正式環境前綴、Test Plan version 與 Run ID；不得包含 Production identifier。
- Fresh run 從空白 isolated state 開始；Seeded run 使用版本化 fixture manifest。
- 每次測試記錄 Run ID、commit SHA、schema proposal hash、fixture hash、預期與實際結果。
- Cleanup 必須可驗證且只作用於該 Run 的 isolated resources；刪除需另行受控。
- Repeatability 要求同一輸入得到相同 constraint、trigger、rollback 與 final-state 結果。
- Failure capture 包含 error class、affected phase、rollback evidence 與 residual scan，不保存 Secret 或完整 PII payload。

## Stage Responsibilities

| Stage | 目的 | 資料限制 | Exit Evidence |
| --- | --- | --- | --- |
| SQLite Syntax Review | 靜態相容性預審 | 無資料庫 | parser／review report |
| Local D1 | 驗證基本語意與 deterministic fixture | synthetic only | local run evidence |
| Fresh Isolated D1 | 驗證全新建立與 phase ordering | synthetic only | clean install evidence |
| Seeded Isolated D1 | 驗證 upgrade、conflict、rollback | synthetic only | seeded transition evidence |
| Integration | 驗證未來 runtime contract | synthetic only | contract evidence |
| Staging | 驗證操作與監控 | approved non-production data only | staging approval evidence |
| Production | 僅在全部 Gate 後執行 | approved production policy | separate execution record |

## Database Naming Rule

未來測試資源名稱只使用受控的 Stage、Run ID 與 Purpose，例如概念格式 `<stage>-<run-id>-<purpose>`；不得包含客戶、正式 Tenant、Production identifier、帳號或資料庫實際識別碼。名稱配置與資源建立仍需獨立測試執行核准。
