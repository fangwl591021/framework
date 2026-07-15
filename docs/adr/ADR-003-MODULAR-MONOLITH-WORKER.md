# ADR-003: Begin with a Modular Monolith Cloudflare Worker

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
- 相關範圍：Application Composition、Cloudflare Workers、Domain Module Boundaries

## 背景

Framework 初期需要保持部署簡單，但過去大型單檔 Worker 會混合 Route、SQL、商業規則、Provider API 與畫面格式。立即拆成大量 Worker 也可能在邊界尚未成熟前增加部署與協作成本。

## 問題

需要在部署單位數量與程式責任隔離之間建立可演進的起點。

## 限制條件

- 必須使用 Platform Core、Domain Module、Adapter、Extension 與 Application Composition 分層。
- 主入口只能啟動、掛載 Route 與組合依賴。
- 本 ADR 不建立 Worker、Routing Code 或部署設定。

## 候選方案

1. 初期建立一個大型單檔 Worker。
2. 初期採 Modular Monolith Worker，依責任分層但可用一個或少量部署單位。
3. 所有 Domain Module 立即拆成獨立 Worker。

## 方案比較

| 方案 | 優點 | 缺點 | 主要風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| 大型單檔 Worker | 初期修改直接 | 無邊界、難測試、風險集中 | 重回萬行單檔 | 低 |
| Modular Monolith Worker | 部署簡單且保留模組邊界 | 需嚴格治理依賴與檔案責任 | 邊界可能只停留在文件 | 高 |
| 立即多 Worker | 故障與部署可隔離 | 邊界未成熟時成本高 | 過早微服務化 | 中 |

## 最終決策

初期以一個或少量 Worker 部署單位運作，但程式架構必須分離：

- Platform Core
- Domain Modules
- Adapters
- Extensions
- Application Composition

主入口不得承載大量 SQL、完整商業規則、Provider API 細節、Flex 組版、OCR 流程、Point 計算或客戶專屬條件。

```text
Modular Monolith 不等於大型單檔 Worker。
```

## 多 Worker 觸發條件

出現下列一項以上且有量測或風險證據時，建立新 ADR 評估拆分：

- Bundle 或 Cloudflare 執行限制
- 不同 Security Boundary 或資料存取權限
- 高風險外部整合隔離
- Failure Isolation
- Independent Deployment Cycle
- 流量與效能特性明顯不同
- Queue Consumer 或 Cron Workload 需獨立執行
- 不同團隊需要獨立維護

## 決策理由

Modular Monolith 讓早期部署保持簡單，同時用 Module Contract、依賴方向與 Owned Data 建立未來可拆分的實質邊界。

## 正面影響

- 降低初期部署、Observability 與跨 Worker 協作成本。
- Domain Module 可在同一部署內獨立測試與版本化。
- 未來拆分依據由實際安全、流量與營運證據驅動。

## 負面影響

- 單一部署失敗可能影響多個 Module。
- 必須持續防止 private import、共用資料表與入口膨脹。
- 不同 Module 的發布週期初期可能被同一部署綁定。

## 風險

- 團隊把「單一部署」誤解為「所有程式放同一檔案」。
- Domain Module 只做資料夾分隔，實際仍直接操作彼此資料。
- Worker 接近執行限制後才發現沒有可拆分 Interface。

## 後續工作

- [ ] 建立 Application Composition 與主入口責任文件。
- [ ] 每個 Domain Module 在實作前完成 Module Contract。
- [ ] 建立依賴、檔案行數、Bundle、流量與錯誤隔離審查門檻。
- [ ] 觸發拆分條件時建立新的 Proposed ADR。

## 重新檢討條件

- 任一多 Worker 觸發條件成立。
- Modular Boundary 無法在單一部署中被測試或強制。
- Cloudflare 限制或組織責任改變。

## 相關文件

- [Development Standard](../03-DEVELOPMENT-STANDARD.md)
- [Version and Dependency Rules](../12-VERSION-DEPENDENCY-RULES.md)
- [Module Contract Standard](../19-MODULE-CONTRACT-STANDARD.md)
