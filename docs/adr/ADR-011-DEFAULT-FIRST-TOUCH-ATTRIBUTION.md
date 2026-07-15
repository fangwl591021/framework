# ADR-011: Use First Valid Touch with a 30-Day Default Attribution Window

## 基本資料

- 狀態：Accepted
- 日期：2026-07-15
- 決策人：Tony
- Architecture Owner Approval：Accepted by Tony
- Approval Date：2026-07-15
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Supersedes／Superseded By：None／None
- 相關範圍：Attribution Engine

## 背景與問題

Framework 需要可預期的 Attribution Default，同時允許 Tenant 明確選擇其他模型。未版本化 Window／Policy 會使同一 Conversion 在不同時間得到不同結果。

## 限制條件

- Referral 不被 Touch 覆寫；Commission 不由 Attribution 支付。
- Tenant／Conversion／Share Link Scope 必須一致。
- 歷史 Conversion 不因 Policy 變更回算。

## 候選方案與比較

| 方案 | 優點 | 缺點 | 風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| First Valid Touch / 30 days | 穩定、易解釋 | 不反映最後互動 | 中低 | 高 |
| Last Valid Touch | 反映最近互動 | 容易被最後點擊影響 | 中 | 高 |
| No Attribution | 最保守 | 無推廣歸屬 | 低 | 高 |
| Fractional Multi-touch | 分配細 | 高複雜與爭議 | 高 | 低 |

## 最終決策

Framework 預設 `First Valid Touch`、`30-Day Window`。Tenant 可明確選擇 `Last Valid Touch` 或 `No Attribution`。Model 與 Window 必須版本化，Conversion 使用發生時 Policy，不回溯重算。無有效 Touch 時為 Unattributed；不支援任意多點比例分配預設。

## 決策理由與影響

提供一致的預設與清楚 Evidence，同時保留 Tenant Configuration。實作前仍需定義 30 天的時間邊界、時區與 inclusive semantics。

## 風險與後續工作

- Clock／timezone ambiguity；Token tampering；duplicate conversion。
- [ ] Contract Test 覆蓋 window boundary、first／last／none、policy change、unattributed。

## 重新檢討條件

法規或正式業務需要不同 Window、跨裝置 Evidence 或多點模型，並完成新 ADR。

## 相關文件

- [Attribution Engine Contract](../36-ATTRIBUTION-ENGINE-CONTRACT.md)
- [ADR-005](ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md)
