# Module Promotion Standard

## 目的

Candidate Source 的功能只有在完成 Read-only Audit、去客戶化、Module Contract、Registry Entry、Boundary Design 與正式驗證後，才可能晉升為 Framework 資產。來源程式可運作不是晉升證據。

## 必答問題

每個 Candidate 必須回答並附證據：

1. 解決什麼問題？
2. 是否只適用單一客戶？
3. 是否可用於至少兩個具實質差異的正式場景？
4. 哪些部分是共用能力？
5. 哪些部分是 Tenant Configuration？
6. 哪些部分應成為 Extension？
7. 是否依賴 LINE 或其他單一 Provider？
8. 是否可替換成 WhatsApp、Web 或其他 Channel？
9. 是否有明確 Owned Data 與 Read-only External Data？
10. 是否有明確 Permission、Tenant、Brand 與 Shop Boundary？
11. 是否支援 Multi Tenant？
12. 是否有完整 Module Contract 與 Testing Requirements？
13. 是否有 Error Model 與 Retry Policy？
14. 是否有 Audit Requirements？
15. 是否有 Idempotency Requirements？
16. 是否存在 PII 或其他敏感資料？
17. 是否符合 Security、Privacy 與最小權限？
18. 是否有 Version、Backward Compatibility、Migration 與 Rollback？
19. 是否會讓 Platform Core 綁定特定客戶？
20. 是否真的值得進 Framework？

## 必要治理資料

- **Architecture Owner Approval**：Stable、Core Approved、Breaking Change 必須由 Tony 最終批准。
- **Module Owner**：未指定 Owner 不得進入 Experimental。
- **Module Contract**：必須符合 [Module Contract Standard](19-MODULE-CONTRACT-STANDARD.md)。
- **Module Registry Entry**：必須符合 [Module Registry Standard](20-MODULE-REGISTRY-STANDARD.md)。
- **ADR Reference**：重大 Boundary、Data、Provider、Worker 或 Breaking Change 需引用 ADR。
- **Security Review**：包含 Permission、PII、Tenant Safety、Audit、Idempotency 與外部依賴。
- **Production Verification Evidence**：Stable 需引用正式場景、版本、日期、Scope 與驗證結果。

## 評分表

前七項分數越高越成熟；`Extraction Cost` 與 `Technical Debt` 越高代表成本或風險越高。每項都需附證據。

| 評分欄位 | 1 分 | 3 分 | 5 分 | 分數 | 證據 |
| --- | --- | --- | --- | --- | --- |
| Reuse Potential | 單一客戶 | 多個相似場景 | 兩個以上實質差異場景 | | |
| Tenant Safety | 未定義 | 部分隔離 | 跨 Tenant 負面案例已驗證 | | |
| Channel Independence | 綁定單一 Channel | 可抽換未驗證 | 多 Channel／Provider 已驗證 | | |
| Configuration Readiness | 大量硬編碼 | 部分設定化 | Configuration／Policy／Strategy 邊界完整 | | |
| Testability | 無法獨立測試 | 部分測試 | 完整 Contract 與營運測試 | | |
| Security Readiness | 風險未知 | 已盤點 | Review 與控制證據完整 | | |
| Operational Readiness | 無監控回滾 | 部分具備 | Observability、Feature Flag、Audit、Rollback 完整 | | |
| Extraction Cost | 低 | 中 | 高 | | |
| Technical Debt | 低 | 中 | 高 | | |

完成評分後另填 `Promotion Recommendation`：`Reject`、`Keep in Project`、`Extension Candidate`、`Module Candidate`、`Core Candidate` 或 `Needs Refactor`。評分不會自動決定分類；重大 Tenant、Security 或客戶耦合缺口可以否決高分項目。

## Stable Qualification

Stable 至少需要兩個具有實質差異的正式使用場景，差異可來自產業、Business Flow、Channel、Permission Model、Configuration、Transaction／Workflow、Provider 或 Extension。

下列不合格：

- 相同程式與流程只更換品牌名稱
- 同一 Tenant 複製測試資料
- 同一功能由不同使用者操作
- Demo 或未正式上線環境

## Promotion Gate

- [ ] Read-only Audit 與 Gap Analysis 完成。
- [ ] Module Owner、Contract、Registry Entry 與 Lifecycle 一致。
- [ ] Public Interface、Owned Data、Configuration 與 Extension Points 完整。
- [ ] Security Review、PII、Audit、Idempotency、Permission 已完成。
- [ ] Version、Migration、Rollback、Deprecation 與 Known Limitations 已記錄。
- [ ] Stable 已有兩個實質差異正式場景的 Production Verification Evidence。
- [ ] Architecture Owner Tony 已完成必要批准。
- [ ] 無來源程式、Secret、正式資料或客戶識別直接搬入 Framework。

Core Candidate 還必須證明不能合理留在 Domain Module、Adapter 或 Extension；`Candidate` 不得被描述為 Implemented、Stable、Production Ready 或 Core Approved。
