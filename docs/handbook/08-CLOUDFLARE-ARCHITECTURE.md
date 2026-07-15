# Cloudflare Architecture

> Cloudflare First ≠ Every Service Must Be Used

實際 Application 只選用有明確責任、容量與失敗模型的服務。正式基準見 [Cloudflare Standard](../04-CLOUDFLARE-STANDARD.md) 與 [ADR-003](../adr/ADR-003-MODULAR-MONOLITH-WORKER.md)。目前沒有 Worker、Binding、Database 或 Deployment。

| Service | Responsibility | Not Responsible For |
| --- | --- | --- |
| Workers | API、Adapter、邊緣執行與輕量協調；初期可採 Modular Monolith | 巨型單檔、所有 Domain Logic、未隔離 Provider 細節 |
| D1 | Transactional／relational Source of Truth Candidate | Large Media、任意 JSON、已批准 Physical Schema（目前沒有） |
| KV | Cache、低頻設定讀取加速、可重建副本 | Point Ledger、Balance、Permission 或交易唯一真相 |
| R2 | Files、Images、Documents、Exports | Business Transaction、Permission Truth |
| Queues | Async Work、Retry、削峰與後續處理 | Immediate User Response、核心交易同步成功判定 |
| Cron | 週期觸發維護／彙整 | 大量 Domain Logic 或不可恢復批次 |
| Durable Objects | Serialized Coordination、Realtime Connection Candidate | General Database Replacement、所有資料預設 Storage |
| AI Gateway | AI request observability、routing、cost、cache、security policy | AI Engine 的 business／application policy |
| Cache | 安全可共用內容與重複計算加速 | 未區分 Tenant／Permission 的敏感資料 |

## 共通 Gate

- Production、Staging、Development 資源隔離。
- Secret 不進 Repository。
- Cache Key 包含 Tenant、語言、版本與 Permission 影響因子。
- Queue Consumer 具 Idempotency、Retry、Dead-letter／Manual Review 候選。
- Worker 入口只組合依賴與 Route，不承載完整商業流程。
- 服務選擇需容量、成本、Failure、Observability 與 rollback evidence；不能因 Cloudflare 有此服務就預設採用。
