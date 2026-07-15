# Architecture Ownership

## 目的

本文件定義 Platform Core Framework 的架構治理角色、決策權與執行責任。所有角色都必須區分「提出建議」、「批准決策」、「完成實作」與「驗證正式環境」。

## Architecture Owner

目前的 Architecture Owner 為 **Tony**。

Architecture Owner 擁有以下最終批准權：

- Platform Core 重大變更與長期方向
- ADR 的 `Accepted` 或 `Rejected` 狀態
- Platform Core 邊界調整
- Module 晉升至 `Stable` 或 `Core Approved`
- Breaking Change
- 跨 Domain Module 責任衝突
- Security Exception

Architecture Owner 的批准不代表實作已完成或正式環境已驗證。

## Platform Architect

Platform Architect 可由 Tony 或未來經正式授權的人員擔任。

職責：

- 準備架構方案與 Draft ADR
- 維護文件與英文名詞一致性
- 審核 Module Contract 與 Module Registry Entry
- 審核資料、Permission、Tenant、Brand 與 Shop 邊界
- 評估是否需要 ADR
- 向 Architecture Owner 提出批准、拒絕或補件建議

除非已取得 Architecture Owner 的正式授權，Platform Architect 不得自行把重大 ADR 改為 `Accepted`。

## Module Owner

每個正式 Domain Module 必須指定 Module Owner。

職責：

- 維護 Module Contract、Module Registry Entry 與文件
- 維護版本、相容性與 Deprecation Policy
- 確認 Owned Data、Permission 與 Tenant Boundary
- 確認測試、安全、Observability 與營運準備
- 提出晉升、降級、Breaking Change 或棄用建議
- 提供 Stable 所需的正式使用場景證據

Module Owner 可以提出晉升，不得自行批准 `Stable` 或 `Core Approved`。

## Implementer

Implementer 包含工程師、Codex 與其他 AI 協作者。

職責：

- 依已批准的 ADR、Boundary 與 Module Contract 實作
- 列出修改範圍、風險、測試與未測試項目
- 執行適當驗證並保留證據
- 發現設計不完整或矛盾時停止擴張，提出 Proposal

Implementer 不得自行改變已批准架構、接受 ADR、批准晉升或用單一客戶需求覆蓋 Framework 規則。

## Reviewer

職責：

- 審查文件與程式是否符合 Contract
- 確認沒有跨 Tenant、Brand 或 Shop 資料污染
- 確認沒有未授權的 Platform Core 修改
- 檢查 Security、PII、Idempotency、Audit Log 與 Backward Compatibility
- 區分 `Decision Accepted`、`Implementation Completed` 與 `Production Verified`

## Authorized Operator

Authorized Operator 是經組織授權執行 Schema Migration 或 Production Deployment 的角色。其授權範圍、環境與回滾責任必須明確；技術執行授權不等同於修改 Framework 架構的權力。

## RACI

`R`＝Responsible，`A`＝Accountable／最終批准，`C`＝Consulted，`I`＝Informed。

| 活動 | Architecture Owner | Platform Architect | Module Owner | Implementer | Reviewer | Authorized Operator |
| --- | --- | --- | --- | --- | --- | --- |
| 新 Module Candidate | A | C | R | C | C | I |
| Module Contract | I | A | R | C | C | I |
| Stable 晉升 | A | R | R | C | C | I |
| Core Approved 晉升 | A | R | C | I | C | I |
| Breaking Change | A | R | R | C | C | I |
| 新 Adapter | I | A | R | R | C | I |
| 新 Extension | I | C | A | R | C | I |
| Schema Migration | C | C | A | R | C | R |
| Production Deployment | I | I | A | C | C | R |
| ADR Acceptance | A | R | C | C | C | I |
| Security Exception | A | R | C | C | C | I |

若工作同時涉及 Platform Core Boundary、Breaking Change 或重大 Security Exception，即使原表由其他角色負責，Architecture Owner 仍保留最終批准權。Production Deployment 可由 Authorized Operator 執行，但必須取得該 Application 或 Domain Module 的授權與 Release Gate 證據。

## 禁止事項

- AI、Codex、工程師或 Module Owner 自行將 Candidate 改為 Stable。
- 未經 Tony 批准，將 Module 改為 Core Approved。
- 將 Draft ADR 當成 Accepted Decision。
- 以程式已可運作作為架構批准證據。
- 以 Production Deployment 成功推導 Module 已 Stable。
