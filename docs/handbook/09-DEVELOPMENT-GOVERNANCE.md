# Development Governance

> Decision、Implementation、Verification 與 Promotion 分別治理

## Roles

| Role | Responsibility | 不得自行做的事 |
| --- | --- | --- |
| Architecture Owner（Tony） | 最終批准 ADR、Core Boundary、Stable／Core Approved、Breaking Change | 批准不等於實作或驗證完成 |
| Platform Architect | 準備 Proposal／Draft ADR、審核 Contract／Boundary | 未授權時接受重大 ADR |
| Module Owner | 維護 Contract、Registry、Version、Boundary、Evidence | 自行批准 Stable／Core Approved |
| Implementer | 依已批准設計實作並驗證 | 改變 Accepted Architecture、以客戶需求覆蓋 Core |
| Reviewer | 查 Contract、Tenant、Security、Compatibility 與狀態 | 以程式可運作推導 Stable |
| Authorized Operator | 在明確授權下執行 Migration／Deployment | 修改 Framework Architecture |

完整權責見 [Architecture Ownership](../18-ARCHITECTURE-OWNERSHIP.md)。

## Decision Flow

```text
Problem
→ Read-only Audit
→ Proposal
→ ADR／Contract
→ Architecture Review
→ Implementation
→ Verification
→ Promotion
```

- 重大 Decision 使用 ADR；Accepted 只表示 Tony 接受 Decision。
- Domain Module 進 Experimental 前要有 Contract 與 Registry Entry。
- Module Lifecycle：Idea → Candidate → Extracting → Experimental → Stable → Core Approved → Deprecated → Retired。
- Stable 至少需要兩個具實質差異的正式場景與 Production Verification Evidence。
- Branch／PR 合併只讓文件成為 Repository 基準，不自動改變 Implementation／Verification 狀態。

正式來源：[ADR Template](../13-ADR-TEMPLATE.md)、[Module Lifecycle](../11-MODULE-LIFECYCLE.md)、[Promotion Standard](../14-MODULE-PROMOTION-STANDARD.md)、[Version／Dependency Rules](../12-VERSION-DEPENDENCY-RULES.md)。

## Change Gate

1. 確認 Repository／Branch／HEAD／Workspace。
2. 讀 relevant Accepted ADR、Boundary、Contract 與 Data Model。
3. 先做 Read-only Audit；不從檔名猜測。
4. 將差異分類為 Configuration、Policy／Strategy、Extension、Domain Module 或 Platform Core。
5. 限縮修改，列出風險、測試、未測試與 Production Impact。
6. Branch／PR Review 後才合併；Breaking Change 需 Tony 與 migration evidence。

## QA Governance Gate

任何 Test Plan Approval 必須先依 [QA Governance Foundation](../qa-governance/README.md) 定義 Test Case、Fixture／Seed、Expected Result、Evidence、Coverage、Execution Lifecycle 與批准責任，並完成 Readiness Checklist。

Governance Design、Test Plan Approval、Test Library Implementation、Test Execution 與 Evidence Verification 是五個獨立狀態。文件合併不得被視為測試已完成；PR #9 仍維持 NO-GO，直到其測試計畫完成 QA Governance 映射與獨立核准。
