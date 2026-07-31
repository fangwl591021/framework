# Local Demo Guide

`local:setup` 僅對 Wrangler Local D1 套用正式 0001～0007，再套用 `local-demo/schema.sql`。後者只保存 fixture marker 與短效 local session，不是正式 Migration。Setup 頁面透過既有 Application Services 建立 fixture，重複執行安全回放。

`local:reset` 只刪除 Repository 內 `.wrangler/state/v3/d1` 的本機狀態後重建；不含 `--remote`，不存取 Cloudflare API。

Production entry `src/index.ts` 不 import Local Demo。Local route 只存在於 `wrangler.local.jsonc` 的獨立 entry。