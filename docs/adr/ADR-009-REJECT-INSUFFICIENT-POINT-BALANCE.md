# ADR-009: Reject Point Transactions When Balance Is Insufficient

## 基本資料

- 狀態：Accepted
- 日期：2026-07-15
- 決策人：Tony
- Architecture Owner Approval：Accepted by Tony
- Approval Date：2026-07-15
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Supersedes／Superseded By：None／None
- 相關範圍：Point Engine、Redemption Engine

## 背景與問題

跨專案若對餘額不足採用部分成功、負餘額或隱含 Credit，會使 Ledger、Receipt 與重試結果不一致。Framework 需要安全預設。

## 限制條件

- 不得直接改 Balance 或建立成功但未完整扣除的 Transaction。
- Tenant Policy 不得突破 Ledger、Permission 與 Audit。
- 本 ADR 不建立 Schema 或 Runtime。

## 候選方案與比較

| 方案 | 優點 | 缺點 | 風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| Reject Entire Transaction | 結果明確、Ledger 一致 | 使用者需補足餘額 | 較低 | 高 |
| Partial Deduction | 使用彈性 | 結果與 UI 複雜 | 誤扣／對帳 | 中 |
| Negative／Credit | 支援信用 | 法務、風控、帳務複雜 | 高 | 低 |

## 最終決策

預設餘額不足時整筆拒絕，不允許負餘額、不預設部分扣除、不建立成功 Point Transaction。失敗結果明確但不洩漏敏感資料。Partial Deduction、Hold、Credit Limit 需新版本化 Policy、Contract Change 與 ADR。

## 決策理由與影響

此預設最容易維持 Atomic Intent、Idempotent Result 與 Ledger 對帳。代價是 Tenant 無法在未另行設計下提供部分扣除。

## 風險與後續工作

- Projection 延遲可能誤判；實作前需一致性與 concurrency 設計。
- [ ] Point／Redemption Contract Test 覆蓋 insufficient、duplicate、concurrent request。
- [ ] Schema Sprint 評估 Source-of-Truth 與 constraint。

## 重新檢討條件

合法業務需要 Partial Deduction、Hold 或 Credit，且完成帳務、安全、Correction 與 Tenant Policy 評估。

## 相關文件

- [Point Engine Contract](../34-POINT-ENGINE-CONTRACT.md)
- [Transaction Safety](../39-TRANSACTION-SAFETY-STANDARD.md)
