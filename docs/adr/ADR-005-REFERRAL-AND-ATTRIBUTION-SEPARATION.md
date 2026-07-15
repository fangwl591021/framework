# ADR-005: Separate Referral Relationship from Attribution

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
- 相關範圍：Referral、Attribution、Membership、Conversion

## 背景

推薦加入關係與每筆轉換的行銷歸因常被混為同一欄位，造成後續點擊覆寫長期 Referrer、無法保存多次 Touch，並讓獎勵規則耦合。

## 問題

需要同時表示長期 Membership Referral、行銷互動與單次 Conversion 的最終判定。

## 限制條件

- Tenant Boundary 不得被突破。
- 歷史 Evidence 與 Policy Version 必須可追溯。
- 本 ADR 不建立 Schema、Commission 或 Runtime。

## 候選方案

1. 以單一 Referrer 欄位同時表示所有概念。
2. 分離 Referral Relationship、Attribution Touch 與 Attribution Record。
3. 只保留 Touch，由報表即時計算所有關係。

## 方案比較

| 方案 | 優點 | 缺點 | 主要風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| 單一欄位 | 簡單 | 語意與歷史混亂 | 覆寫與重複獎勵 | 低 |
| 三概念分離 | 邊界清楚、可稽核 | Contract 較多 | Policy 需版本化 | 高 |
| 只存 Touch | 原始事件完整 | 查詢與一致性複雜 | 最終結果漂移 | 中 |

## 最終決策

Referral Relationship、Attribution Touch、Attribution Record 分離。Referral 表示 Tenant Membership 的長期直接推薦關係；Touch 表示行銷互動；每個 Conversion 同時最多一個 Active Attribution Record。Attribution 不改寫 Referral，Commission／Reward 為下游獨立決策。

## 決策理由

分離後可保留不同生命週期、Owner、Evidence 與 Correction 方法，避免行銷點擊破壞 Membership 關係。

## 正面影響

- Referral 與 Conversion Attribution 可獨立演進。
- 保留完整 Touch 與 Policy Version。
- Correction 不必覆寫歷史。

## 負面影響

- 需要跨 Module Business Reference 與 Event Contract。
- Application 必須清楚選擇查詢哪種關係。

## 風險

- UI 仍可能用「推薦人」混稱兩種結果。
- 下游 Reward 若未去重，仍可能重複發放。

## 後續工作

- [ ] 建立 Referral 與 Attribution Module Contract。
- [ ] 定義 Conversion Reference、Correction 與 Event Idempotency。
- [ ] 由各 Tenant 決定 Attribution Window／Model。

## 重新檢討條件

- 實際案例證明三概念無法表達必要法規或計價關係。
- 多層獎勵需求取得獨立 Accepted ADR。

## 相關文件

- [Referral Relationship Model](../27-REFERRAL-RELATIONSHIP-MODEL.md)
- [Attribution Model](../28-ATTRIBUTION-MODEL.md)
