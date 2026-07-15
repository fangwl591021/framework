# ADR-012: Reverse or Correct Completed Transactions Instead of Deleting Them

## 基本資料

- 狀態：Accepted
- 日期：2026-07-15
- 決策人：Tony
- Architecture Owner Approval：Accepted by Tony
- Approval Date：2026-07-15
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Supersedes／Superseded By：None／None
- 相關範圍：Point、Referral、Attribution、Attendance、Redemption、Audit

## 背景與問題

直接 Delete 完成交易會破壞 Ledger、Idempotency、下游事件與稽核，使問題無法重現。Framework 需要一致的歷史修正語意。

## 限制條件

- 必須保留 Original Record、Actor、Reason、Evidence 與前後關聯。
- Privacy deletion 不得破壞必要財務／Audit Ledger。
- 不假設跨 Module distributed transaction。

## 候選方案與比較

| 方案 | 優點 | 缺點 | 風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| Delete／Overwrite | 表面簡單 | 歷史消失 | 對帳、詐欺、重送 | 低 |
| Reverse／Correct／Adjust | 完整可追溯 | Record／Workflow 較多 | 管理複雜 | 高 |
| Rebuild all history | 可重算 | 成本高且 Evidence 可能不足 | 結果漂移 | 低 |

## 最終決策

已完成交易不得直接刪除。Point／Redemption 等效果使用 Reverse；歷史判定使用 Correction；無法由一般交易表示的授權差額使用 Adjust。保留 Original Record、Audit 與 Related Reference。法定個資刪除採 Anonymization／Retention Policy，不破壞必要 Ledger。

## 決策理由與影響

此模式保護交易真相、重送一致性與責任追溯。代價是 Query、UI 與 Migration 必須理解 Active／Reversed／Corrected History。

## 風險與後續工作

- Reverse 重送或部分 Compensation 失敗。
- [ ] 每個 Engine 定義 Allowed State、Permission、Idempotency、Notification 與 Reconciliation。

## 重新檢討條件

法規要求物理刪除且無法以 Anonymization 滿足，需 Privacy、Legal、Architecture 共同新 ADR。

## 相關文件

- [Correction and Reversal Standard](../41-CORRECTION-REVERSAL-STANDARD.md)
- [Transaction Safety](../39-TRANSACTION-SAFETY-STANDARD.md)
