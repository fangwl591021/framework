# AI Development Rule

## 目的

AI、Codex 與工程師使用相同的 Preflight、Read-only Audit、分層、修改與驗收規則。AI 是開發協作者，不是跳過架構、審查與證據的捷徑。

## 強制作業規則

1. **先做 Preflight**：確認任務範圍、禁止事項與驗收條件。
2. **確認 Repository、Branch、Commit**：比對 local、origin 與 remote；不一致時停止寫入。
3. **先做 Read-only Audit**：辨識現況、依賴、資料與未完成變更後才設計。
4. **不可憑檔名猜測架構**：必須追查實際入口、Interface、資料流與部署表面。
5. **不可 Copy/Paste 舊專案**：舊功能只能依 [Legacy Asset Extraction](17-LEGACY-ASSET-EXTRACTION.md) 分析。
6. **未確認資料邊界前不得建立 Schema**：先定義 Platform User、Tenant Membership、Owned Data 與 Permission。
7. **未確認 Module Contract 前不得寫 API**：先定義 Responsibility、Input、Output、錯誤、版本與 Tenant Scope。
8. **不得修改 Platform Core 解決單一客戶問題**：先評估 Configuration、Policy、Strategy 或 Extension。
9. **必須列出修改檔案**：區分新增、更新與刪除，避免夾帶無關變更。
10. **必須列出測試與未測試項目**：不得用「應該可用」代替證據。
11. **必須列出是否部署**：未部署時明確寫 `Deployment Performed: No`。
12. **必須列出是否碰觸正式資料**：未存取時明確寫 `Production Data Accessed: No`。
13. **必須列出風險與下一步**：區分已決定事項與待確認問題。
14. **不確定時停止寫入**：仍應完成可行的唯讀分析，說明阻塞與需要的證據。
15. **大型任務分 Sprint**：不得一次重寫整個 Framework 或同時混入架構、程式、Schema 與部署。

## 標準工作順序

```text
Preflight
→ Read-only Audit
→ Boundary Analysis
→ Design
→ User／ADR Approval（需要時）
→ Scoped Change
→ Validation
→ Diff Review
→ Branch／Pull Request
→ Completion Report
```

## AI Coding 邊界

- 新能力先判斷 Platform Core、Domain Module、Adapter、Extension 或 Application／Tenant Configuration。
- 禁止建立大型單體檔案或超大型單一 Worker。
- 禁止臆測未提供的 Schema、Secret、ID、Tenant、環境或商業規則。
- 禁止以註解、空殼、假資料或文件宣稱程式已完成。
- 禁止在未驗證實際環境時宣稱部署、資料遷移或 UI 成功。
- 發現工作樹已有變更時必須辨識並保留，不得覆蓋或混入提交。
- 破壞性操作、跨 Repository 寫入與 Production 變更必須取得明確授權。

## 檔案與模組治理

- 單一檔案應保持單一責任與合理大小，使用 [Development Standard](03-DEVELOPMENT-STANDARD.md) 的審查門檻。
- 不得為追求檔案小而產生無意義碎片化。
- Module 間不得直接操作彼此 Owned Data 或 Import private function。
- Adapter 不得決定商業規則；Extension 不得修改 Platform Core private 實作。

## 完成回報最低內容

- Preflight 結果與初始 Commit
- 新增、更新、刪除檔案清單
- Architecture Decisions 與未決事項
- 測試、格式、連結、命名與 Git Diff 驗證
- Code／Schema／Deployment／Production Data 狀態
- Working Branch、Commit、Push 與 Pull Request 結果
- Risks、Open Questions 與下一 Sprint 建議
