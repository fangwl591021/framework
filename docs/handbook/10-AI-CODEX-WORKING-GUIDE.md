# AI and Codex Working Guide

> 可直接提供給 Codex 的任務前置規則；正式權限以 [AI Development Rule](../08-AI-DEVELOPMENT-RULE.md) 為準

## 任務開始前

1. Confirm Repository.
2. Confirm Branch.
3. Confirm HEAD and local／origin／remote consistency.
4. Confirm Workspace and preserve unrelated changes.
5. Read [Architecture Handbook](../../ARCHITECTURE-HANDBOOK.md).
6. Read relevant Accepted ADR.
7. Read relevant Module Contract／Registry.
8. Read Data Boundary／Logical Model.
9. Perform Read-only Audit of actual entrypoint、dependency、runtime surface and data target.
10. Report GO／NO-GO before writes when the task defines a preflight gate.

## Codex 禁止事項

- 憑檔名、單一函式或單一成功案例猜測架構。
- 直接 Copy Candidate Source 或既有專案程式。
- 為單一客戶直接修改 Platform Core。
- 未經 Contract／Boundary 建立 Schema 或大型 Domain API。
- 未經 ADR 做 Breaking Change。
- 自行把 Candidate 改 Stable／Core Approved。
- 自行把 Proposed 改 Accepted。
- 把 Accepted 推導成 Implemented 或 Verified。
- 未經明確授權部署、執行 Migration 或存取 Production Data。

## 標準工作順序

```text
Preflight
→ Read-only Audit
→ Gap Analysis
→ Boundary and Contract
→ Draft ADR when needed
→ Architecture Approval
→ Scoped Implementation
→ Validation
→ Diff Review
→ Branch／Pull Request
→ Completion Report
```

如果必要 Repository、Branch、HEAD、Environment、Contract 或 Production Target 無法驗證，回報 `NO-GO`，停止寫入並列出需要的證據。禁止 reset、force push 或覆蓋他人工作。

## 狀態用語

| Claim | 最低證據 |
| --- | --- |
| Accepted | Accepted ADR／Architecture Owner reference |
| Implemented | 指定 commit／files／tests |
| Verified | 指定 environment、scope、time、reproducible evidence |
| Production Ready | 完整 release／security／operation gate；不可由單一測試推導 |

## 標準完成回報

```text
Preflight
Scope
Changes
Validation
Git
Production Impact
Risks
Open Questions
Recommended Next Step
```

必須明確寫出 Code、Schema、Migration、Deployment、Production Data 是否有建立、執行或存取。大型任務按 Sprint 分開，不能一次混入架構、Runtime、Schema、Migration 與 Deployment。
