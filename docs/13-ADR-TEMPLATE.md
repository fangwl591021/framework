# Architecture Decision Record Template

Architecture Decision Record（ADR）用於記錄重要且難以逆轉的架構決策。ADR 記錄當時資訊、取捨與重新檢討條件，不用來取代程式規格或專案待辦。

## 狀態值

- `Proposed`
- `Accepted`
- `Superseded`
- `Deprecated`
- `Rejected`

## 使用規則

- 每個 ADR 使用唯一且遞增的編號。
- `Accepted` 前必須列出至少一個可行替代方案與比較結果。
- 決策改變時建立新 ADR，並將舊 ADR 設為 `Superseded`；不得改寫歷史理由。
- 尚未取得批准的內容只能標為 `Proposed`。

## 範本

```markdown
# ADR-[編號]：[標題]

## 基本資料

- 狀態：Proposed | Accepted | Superseded | Deprecated | Rejected
- 日期：YYYY-MM-DD
- 決策人：
- 相關 Module／Application：

## 背景

[描述促成此決策的現況與脈絡。]

## 問題

[用可驗證的方式描述需要解決的問題。]

## 限制條件

- [安全、Tenant、法規、成本、時程或相容性限制]

## 候選方案

1. [方案 A]
2. [方案 B]
3. [方案 C]

## 方案比較

| 方案 | 優點 | 缺點 | 風險 | 成本 | 可回滾性 |
| --- | --- | --- | --- | --- | --- |
| A | | | | | |
| B | | | | | |

## 最終決策

[只在 Accepted 後填寫已批准方案。]

## 決策理由

[說明為何此方案在目前限制下最合適。]

## 正面影響

- [預期改善]

## 負面影響

- [已接受的代價]

## 風險

- [風險、監控方式與緩解措施]

## 後續工作

- [ ] [工作與負責人]

## 重新檢討條件

- [當哪些指標、需求或限制改變時重新評估]

## 相關文件

- [文件或 ADR 連結]
```

## 範例標題

以下僅是應建立 ADR 討論的題目，不代表已作出最終決策：

1. `ADR-XXX：是否採用單一 Platform User 搭配多 Tenant Membership 關係`
2. `ADR-XXX：點數規則應以 D1 為唯一來源，還是使用 KV 快取`
3. `ADR-XXX：Framework 初期採模組化單一 Worker，或立即拆成多 Worker`
