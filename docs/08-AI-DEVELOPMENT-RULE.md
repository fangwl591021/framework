# AI Development Rule

## 目的

AI、Codex 與工程師使用相同的 Preflight、Read-only Audit、Decision、Boundary、Contract、修改與驗收規則。AI 是協作者，不是 Architecture Owner，也不能把程式可運作推導成 Framework 批准。

## 權限邊界

AI、Codex 與 Implementer 可以：

- 做 Read-only Audit、Gap Analysis 與風險盤點
- 提出架構方案、Proposal 與 Draft ADR
- 建立 Draft Module Contract 或 Registry Entry
- 實作 Tony 已批准的設計
- 執行測試並整理證據

不得自行：

- 接受或拒絕重大 ADR
- 批准 Candidate 晉升為 Stable
- 批准 Domain Module 晉升為 Core Approved
- 修改 Tony 已批准的 Platform Core Boundary
- 在沒有 Module Contract 時進行大型 Domain Module 實作
- 因現有程式可運作，就判定適合進 Framework

角色與批准權見 [Architecture Ownership](18-ARCHITECTURE-OWNERSHIP.md)。

## Mandatory Handbook Reading

大型任務開始前，AI／Codex 必須先閱讀 [Architecture Handbook](../ARCHITECTURE-HANDBOOK.md) 與 [AI／Codex Working Guide](handbook/10-AI-CODEX-WORKING-GUIDE.md)，再閱讀 relevant Accepted ADR、Module Contract、Registry 與 Data Boundary。Handbook 只作導航，不得取代正式文件。

## 強制作業規則

1. **先做 Preflight**：確認 Scope、禁止事項、驗收、Repository、Branch 與 Commit。
2. **比對 Local／Origin／Remote**：不一致時停止寫入，不覆蓋他人工作。
3. **先做 Read-only Audit**：確認實際入口、依賴、資料流、Deployment Surface 與未完成變更。
4. **不可憑檔名猜測架構**：必須追查 Public Interface、Owned Data 與實際行為。
5. **不可 Copy/Paste Candidate Source**：依 [Legacy Asset Extraction](17-LEGACY-ASSET-EXTRACTION.md) 比較多個來源。
6. **未確認 Boundary 前不得建立 Schema**：先引用 Accepted ADR、Tenant Data Boundary 與 Organization Hierarchy。
7. **未確認 Module Contract 前不得寫大型 API 或 Domain Module**：先定義 Command、Query、Domain Event、Permission 與 Error Model。
8. **不得修改 Platform Core 解決單一客戶問題**：先評估 Configuration、Policy、Strategy 或 Extension。
9. **必須列出修改檔案**：區分新增、更新、刪除及額外一致性修正。
10. **必須列出測試與未測試項目**：不得用推測代替證據。
11. **必須列出 Deployment Status**：未部署寫 `Deployment Performed: No`。
12. **必須列出 Production Data Status**：未存取寫 `Production Data Accessed: No`。
13. **必須列出風險與下一步**：只把 Tony 已批准內容列為 Accepted。
14. **不確定時停止寫入**：仍完成可行唯讀分析，說明阻塞與所需批准。
15. **大型任務分 Sprint**：不得一次混入架構、程式、Schema、Migration 與 Deployment。

## 狀態語意

| 狀態 | 意義 | 不代表 |
| --- | --- | --- |
| Proposed | 已提出但尚未獲批准 | Accepted、可實作 |
| Accepted | Architecture Owner 已接受 Decision | Implemented、Verified |
| Implemented | 已依批准設計完成實作 | Production Verified、Stable |
| Verified | 已在指定 Scope 取得驗證證據 | 其他 Tenant／場景自動適用 |

AI 必須在文件、PR 與完成報告中分別標示這四種狀態，不得用「完成」模糊合併。

## Data and Schema Proposal

AI 在提出資料表或 Migration 前，必須引用：

- Accepted ADR
- Tenant／Brand／Shop Boundary
- Module Contract 的 Owned Data 與 Read-only External Data
- Permission、PII、Audit、Idempotency、Source of Truth 與 Rollback 要求

缺少任一必要 Boundary 或 Contract 時，只能提出 Open Question 或概念模型，不得建立 Schema。

## 標準工作順序

```text
Preflight
→ Read-only Audit
→ Gap Analysis
→ Boundary and Contract
→ Draft ADR（需要時）
→ Tony／Authorized Approval
→ Scoped Implementation
→ Validation
→ Diff Review
→ Branch／Pull Request
→ Completion Report
```

## 檔案與 Module 治理

- 使用 [Development Standard](03-DEVELOPMENT-STANDARD.md) 的檔案審查門檻。
- 不得為追求小檔案產生無意義碎片化。
- Domain Module 間不得直接操作彼此 Owned Data 或 Import private function。
- Adapter 不得決定商業規則；Extension 不得修改 Platform Core private 實作。
- Registry Entry、Lifecycle、Contract、版本與 Approval Reference 必須一致。

## 完成回報最低內容

- Preflight、Initial Commit 與 GO／NO-GO
- Decisions：Proposed／Accepted／Implemented／Verified 狀態
- 新增、更新、刪除文件
- Markdown、連結、名詞、Secret、Diff 與 Contract 驗證
- Code／Schema／Deployment／Production Data 狀態
- Branch、Commit、Push、PR 與 Base Branch
- Risks、Open Questions 與下一 Sprint 建議
