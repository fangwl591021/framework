# ADR-007: Use Single-Layer Referral as the Default Policy

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
- 相關範圍：Referral、Membership、Reward

## 背景

推薦分享常被擴張為多層樹狀關係，但一般 SaaS Membership 只需要知道直接推薦人。預設多層會增加 Cycle、法規、獎勵與查詢風險。

## 問題

Framework 需要安全、可重用且不預設多層獎勵的 Referral 基準。

## 限制條件

- Tenant-scoped，禁止 Self-referral 與 Cycle。
- 一般分享不覆寫有效 Referrer。
- 本 ADR 不定義 Commission。

## 候選方案

1. 預設只保存直接一層 Referral。
2. 預設保存無限多層 Tree。
3. 不保存 Referral，只由 Touch 推導。

## 方案比較

| 方案 | 優點 | 缺點 | 主要風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| 單層 | 清楚、容易稽核 | 不直接支援多層獎勵 | 後續需求需擴充 | 高 |
| 多層 | 可算多代 | 法規與 Cycle 複雜 | 被誤用為 MLM | 低 |
| 只用 Touch | 事件簡單 | 長期關係不穩定 | 結果隨 Window 漂移 | 中 |

## 最終決策

Framework 預設只支援 Tenant-scoped、Single-Layer Direct Referral。每個 Membership 同時最多一個 Active Direct Referrer，使用 First Valid Referrer、No Self、No Cycle、No Normal Overwrite。被介紹者再分享給他人，不會自動讓上層取得收益。不得在 Referral Core 預埋未啟用的多層分潤邏輯；未來若有合法且明確需求，必須使用獨立 Extension、Domain Design 與新 Accepted ADR 評估。

## 決策理由

單層足以支援大多數邀請與推薦場景，且避免把 Platform Core 預設成高風險多層商業模型。

## 正面影響

- Invariant 與查詢簡單。
- 不會因分享鏈自動形成多代權益。
- Referral 與 Attribution 清楚分離。

## 負面影響

- 多層需求需額外 Module／Policy。
- 歷史 Legacy Tree 需降階或另存。

## 風險

- Application 可能自行沿關係遞迴並誤稱 Core 能力。
- Admin Override 未治理時可能破壞下游 Reward。

## 後續工作

- [ ] 定義 Referrer Change／Correction Policy。
- [ ] 建立 Cycle、Self、Duplicate 與 Cross-tenant Scenario Tests。
- [ ] 明確隔離任何 Multi-layer Extension。

## 重新檢討條件

- 至少兩個正式、合法且差異化場景需要共同多層模型。
- 法規、風控或營運證據要求更嚴格的禁止政策。

## 相關文件

- [Referral Relationship Model](../27-REFERRAL-RELATIONSHIP-MODEL.md)
- [ADR-005](ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md)
