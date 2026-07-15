# Module Promotion Standard

## 目的

舊專案功能只有在完成唯讀稽核、去客戶化、邊界設計與驗證後，才可能晉升為 Framework 資產。來源專案運作良好不是晉升證據。

## 必答問題

每個候選項目必須回答並附證據：

1. 解決什麼問題？
2. 是否只適用單一客戶？
3. 是否至少可用於兩種不同產業或場景？
4. 哪些部分是共用能力？
5. 哪些部分是 Tenant Configuration？
6. 哪些部分應成為 Extension？
7. 是否依賴 LINE？
8. 是否可替換成 WhatsApp、Web 或其他通道？
9. 是否有明確資料邊界？
10. 是否有明確 Permission 邊界？
11. 是否支援 Multi Tenant？
12. 是否有測試策略？
13. 是否有錯誤與重試機制？
14. 是否有 Audit Log？
15. 是否有 Idempotency？
16. 是否存在敏感資料？
17. 是否符合個資與最小權限原則？
18. 是否有版本與回滾方式？
19. 是否會讓 Platform Core 綁定特定客戶？
20. 是否真的值得進 Framework？

## 評分表

各欄以 1–5 評分並附一句證據。前七項分數越高越成熟；`Extraction Cost` 與 `Technical Debt` 分數越高代表成本或風險越高。

| 評分欄位 | 1 分 | 3 分 | 5 分 | 分數 | 證據 |
| --- | --- | --- | --- | --- | --- |
| Reuse Potential | 單一客戶 | 多個相似場景 | 跨產業可重用 | | |
| Tenant Safety | 未定義 | 部分隔離 | 已驗證完整隔離 | | |
| Channel Independence | 綁定單一通道 | 可抽換但未驗證 | 多通道已驗證 | | |
| Configuration Readiness | 大量硬編碼 | 部分設定化 | 差異均有明確 Configuration／Strategy | | |
| Testability | 無法獨立測試 | 有部分測試 | 完整獨立與契約測試 | | |
| Security Readiness | 風險未知 | 已盤點 | 控制與證據完整 | | |
| Operational Readiness | 無監控回滾 | 部分具備 | 監控、Audit Log、回滾完整 | | |
| Extraction Cost | 低 | 中 | 高 | | |
| Technical Debt | 低 | 中 | 高 | | |

完成數值評分後，另填寫 `Promotion Recommendation`，使用下方其中一個結論分類。此欄不納入數值總分。

## 結論分類

- `Reject`：風險或耦合不可接受，不再萃取。
- `Keep in Project`：有價值但只適用來源 Application。
- `Extension Candidate`：客戶或產業差異明確，可透過正式 Extension Points 隔離。
- `Module Candidate`：可能成為可組合的 Domain Module，仍需 Experimental 驗證。
- `Core Candidate`：可能是底層共用能力，仍需 ADR 與 `Core Approved` 流程。
- `Needs Refactor`：方向可行，但現況邊界不足，先重構再評估。

評分不會自動決定分類。任何資料隔離、Security、Permission 或客戶綁定的重大缺口，都可以否決高總分候選項目。

## 晉升最低門檻

- 已完成 [Legacy Asset Extraction](17-LEGACY-ASSET-EXTRACTION.md) 所要求的 Read-only Audit。
- 已依 [Module Lifecycle](11-MODULE-LIFECYCLE.md) 逐階段晉升。
- Stable 至少有兩個不同場景或專案的可驗證證據。
- Core Candidate 必須證明不能合理留在 Domain Module、Adapter 或 Extension。
- 無任何來源程式、Secret、正式資料或客戶識別被直接搬入 Framework。
