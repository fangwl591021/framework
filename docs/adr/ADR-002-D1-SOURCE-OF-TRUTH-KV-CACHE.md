# ADR-002: Use D1 as Source of Truth and KV as Optional Cache

## 基本資料

- 狀態：Accepted
- 日期：2026-07-15
- 決策人：Tony
- Architecture Owner Approval：Accepted by Tony
- Approval Date：2026-07-15
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Supersedes：None
- Superseded By：None
- 相關範圍：Database Standard、Point、Membership、Referral、Attribution、Configuration

## 背景

D1 適合需要關聯、交易與一致性的資料；KV 適合高讀取、低頻更新且容忍最終一致性的資料。若未區分 Source of Truth 與 Cache，Point、Attendance、Order 或設定可能出現無法判定的衝突。

## 問題

Framework 需要明確規定一致性資料與讀取快取的責任，避免 KV 被用作交易真相或 Point Balance 唯一來源。

## 限制條件

- Point、Order、Attendance、Referral 與 Attribution 需要可追溯與一致性。
- KV 允許短暫延遲，不適合作為強一致交易來源。
- 本 ADR 只決定責任，不建立 D1 Schema、KV Key 或 Migration。

## 候選方案

1. 所有資料只使用 D1，不使用 KV。
2. D1 作 Source of Truth，KV 只作選用 Cache 或讀取加速。
3. 以 KV 作主要來源，定期同步至 D1。

## 方案比較

| 方案 | 優點 | 缺點 | 主要風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| 只用 D1 | 一致性簡單 | 高讀取設定可能增加延遲與負載 | 效能與成本未最佳化 | 高 |
| D1 Truth＋KV Cache | 保留一致性並可加速讀取 | 需要失效、回源與監控 | Stale Cache | 高，可停用 Cache |
| KV 主要來源 | 讀取快 | 交易與關聯一致性不足 | Point／Order 真相分裂 | 低 |

## 最終決策

D1 作為下列資料的 Source of Truth：

- Tenant Membership 與 Shop Membership
- Point Account 與 Point Transaction
- Attendance Record
- Referral Relationship 與 Attribution Result
- Order、Redemption 與 Approval Status
- 需要一致性的 Configuration

KV 只用於：

- Cache
- 低頻變更 Configuration 的讀取加速
- Feature Flag 快速讀取
- 非交易性資料
- 可容忍短暫延遲的資料副本

修改「加好友送幾點」、「打卡送幾點」等規則時，D1 保存正式值；若使用 KV，必須同步更新或失效。Point Transaction、Attendance 成功、重複贈點判斷與 Point Balance 不得只寫 KV。Cache Miss 必須回到 D1；KV 與 D1 不一致時，以 D1 為準。

## 決策理由

此方案保留 D1 的一致性與稽核能力，同時允許對低頻設定及高讀取路徑採用可移除的 KV Cache。

## 正面影響

- 有唯一且可追溯的資料真相。
- KV 可降低常用設定與 Feature Flag 的讀取延遲。
- Cache 可停用或重建，不會失去正式資料。
- Module Contract 可明確區分 Owned Data 與 Cache。

## 負面影響

- 需要 Cache Key、Expiration、Invalidation 與回源策略。
- 短暫最終一致性可能讓使用者讀到舊設定。
- 需要監控 Cache Hit、Stale Data 與回源失敗。

## 風險

- 規則變更後未失效 KV，導致短暫套用舊規則。
- Cache Key 缺少 Tenant、Brand 或 Shop Scope，造成資料污染。
- 開發者誤把 KV 值當成交易真相。

## 後續工作

- [ ] 在 Module Contract 中標明 Source of Truth、Cache 與一致性需求。
- [ ] 定義 Cache Key Scope、Expiration、Invalidation 與回源錯誤。
- [ ] 為 Point、Attendance、Referral 與 Order 建立 Idempotency 與一致性 Test Plan。
- [ ] 在實作前另案建立資料模型與 Migration 設計。

## 重新檢討條件

- D1 無法滿足已量測的一致性、容量或區域需求。
- Cloudflare 服務語意或限制出現重大改變。
- 某 Domain Module 有經 ADR 證明的不同 Source of Truth 需求。

## 相關文件

- [Cloudflare Standard](../04-CLOUDFLARE-STANDARD.md)
- [Database Standard](../05-DATABASE-STANDARD.md)
- [Core Cross-cutting Candidates](../21-CORE-CROSSCUTTING-CANDIDATES.md)
