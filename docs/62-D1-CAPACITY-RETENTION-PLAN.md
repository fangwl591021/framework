# D1 Capacity and Retention Plan

> Proposal Only · Capacity and Performance Not Verified

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

## Capacity Classification

| Table Group | Volume／Pattern | Retention Concern | Candidate Action |
| --- | --- | --- | --- |
| Tenant／Brand／Shop／Program | Low／read-heavy | lifecycle history | retain authoritative rows |
| Membership／Role Assignment | Medium／read-heavy | consent／authorization history | status＋archive review |
| Point Account／Projection | Medium／hot account | asset reconciliation | retain; rebuild projection |
| Point Transaction | High／append-heavy／historical | financial-like dispute／archive | cursor pagination、minimal indexes |
| Referral Relationship | Medium／historical | correction history | retain versions |
| Attribution Touch | High／append-heavy | privacy／campaign window | bounded retention＋archive candidate |
| Attendance Attempt | High／burst write | evidence sensitivity | short policy candidate＋archive／anonymize |
| Attendance Record | Medium／historical | dispute／event history | retain formal result |
| Redemption | Medium／financial-like | receipt／point reconcile | retain result chain |
| Idempotency Record | High／hot read-write | replay／dispute window | risk-based expiration、archive candidate |
| Audit Record | High／append-heavy／restricted | legal hold／security | tiered archive candidate |

## Growth and Index Considerations

- 使用 keyset cursor；高容量表避免無界 query、`SELECT *` 與深度 OFFSET。
- 每個額外 index 增加 write／storage cost；先用 [Query Evidence](58-INDEX-QUERY-EVIDENCE.md) 與 target D1 query plan 驗證。
- Retention／archive 前先確認 cross-table reference、legal hold、reconciliation與 restore path。
- Aggregation／projection 不取代 source rows；Point Balance 特別只能由有效 Ledger 重建。
- Large backfill／archive 必須分 batch；實際 batch size 由 target plan limits 與量測決定，不在本 Sprint 固定。

## Hot Account Evidence Gate

D1 conditional balance／version update、Unique Guard與local transaction永遠是 correctness boundary。Durable Object不得預設啟用，也不得成為唯一可防止超扣的路徑。

只有在下列指標有 target D1量測、Owner批准門檻、觀測期間與rollback plan後，才可對特定 Account或shard評估 optional Durable Object serialization／load shedding：

- balance/version conflict rate；
- same-key retry rate與write contention error rate；
- Point Command p95／p99 latency；
- 單一 Account burst write rate與queue depth；
- D1 transaction abort／timeout rate。

啟用後仍需 negative test證明直連、replay、failover與DO unavailable路徑不能繞過D1 guard。全域單一 Durable Object禁止；routing key至少使用stable Point Account ID。實際 threshold在Runtime／Capacity Sprint決定，本 Proposal不虛構數值。

## D1 Topology Options

| Option | Benefit | Risk／Unknown |
| --- | --- | --- |
| Shared D1 with `tenant_id` | cross-tenant operations／single schema simpler | blast radius、growth、hot tenant |
| Tenant Group D1 | bounded growth／isolation | routing、migration、group rebalancing |
| Dedicated D1 for large tenants | strongest workload isolation | provisioning、schema drift、operations cost |

不得過早決定每 Tenant 一個 D1 或單一共用 D1。Selection 需要容量、latency、compliance、failure domain、tenant mobility 與 operations evidence，並建立 ADR。

## Retention Decisions Needed

Audit、idempotency、attribution touch、attendance attempt、receipt、identity evidence 與 archive store 尚無期間。Privacy Owner、Security Owner、Domain Owner 與 Tony 需批准 retention class、legal hold、anonymization、restore與 deletion verification。
