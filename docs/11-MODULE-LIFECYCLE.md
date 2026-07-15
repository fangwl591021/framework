# Module Lifecycle

## 生命週期

```text
Idea
→ Candidate
→ Extracting
→ Experimental
→ Stable
→ Core Approved
→ Deprecated
→ Retired
```

`Stable` Domain Module 不必晉升為 Platform Core。`Core Approved` 只適用真正跨 Module、跨 Application 且不可合理替代的底層能力。

## Architecture Owner

Architecture Owner 為 Tony。只有 Tony 可以最終批准：

- Candidate 晉升 Stable
- Domain Module 晉升 Core Approved
- Breaking Change
- 重大 ADR Acceptance／Rejection

Module Owner、Platform Architect、Reviewer、AI、Codex 與 Implementer 可以準備證據與建議，不得自行批准。

## 階段規則

| 階段 | 定義 | 正式使用 | 測試 | 版本 | Breaking Change | 晉升批准 | 問題處理 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Idea | 尚未形成 Boundary 的需求或觀察 | 不可 | 探索證據 | 無 | 允許 | 提案人可建立 | 關閉或保留 |
| Candidate | 看似可重用但未證明跨場景價值 | 不可視為 Framework 能力 | 現況與風險盤點 | 無正式版本 | 允許 | Module Owner 提案、Platform Architect 審核 | 退回 Idea／Keep in Project |
| Extracting | 正在 Read-only Audit、去客戶化與設計 Contract | 不可 | 現況測試與 Test Plan | 可用 `0.0.x` 草案 | 允許但需記錄 | Module Owner | 退回 Candidate |
| Experimental | 有獨立 Contract，可在限定 Scope 試用 | 僅限核准場景 | 單元、Contract、Tenant Boundary、安全 | `0.x.y` | 允許但需 Migration 指引 | Module Owner＋Platform Architect | Feature Flag 停用、退回 Extracting |
| Stable | 通過至少兩個具實質差異的正式場景 | 可以 | 完整回歸、安全、營運與相容性 | `1.0.0` 以上 | 僅 MAJOR | Tony 最終批准 | 回滾；重大缺陷可降回 Experimental |
| Core Approved | 跨 Module／Application 且不可替代的底層能力 | 可以 | 最高層級契約、安全、相容與 Migration | `1.0.0` 以上 | ADR＋MAJOR＋Migration | Tony 最終批准 | 回滾或降回 Stable Module |
| Deprecated | 已公告替代方案與停止支援時間 | 僅供既有使用者遷移 | 維持安全與 Migration 測試 | 保留版本線 | 不新增 Breaking Feature | Module Owner 建議、Tony 批准重大項目 | 延長或撤回 Deprecation |
| Retired | 已停止支援，不得被新 Application 依賴 | 不可 | 保留歷史證據 | 封存 | 禁止 | Repository Maintainer 執行、Tony 知會 | 若恢復，重新從 Candidate 評估 |

## Stable Qualification

Stable 至少需要兩個具有實質差異的正式使用場景。兩個場景不必是完全獨立產品，但至少存在一項實質差異：

- 不同產業或 Business Flow
- 不同 Channel 或外部 Provider
- 不同 Permission Model
- 不同 Configuration 組合
- 不同 Transaction／Workflow
- 不同 Extension

每個場景都必須正式使用，並提供 Contract、版本、測試、營運與 Production Verification Evidence。

### 不合格案例

以下不算兩個場景：

- 相同程式與流程只更換品牌名稱
- 同一 Tenant 複製兩份測試資料
- 同一功能由兩位使用者操作
- 尚未正式上線的 Demo 與測試環境

## 晉升證據

- Module Contract 與 Module Registry Entry
- Module Owner 與 Platform Architect Review
- Architecture Owner Tony Approval
- 兩個實質差異場景及 Production Verification Evidence
- Tenant Safety、Security Review、PII、Idempotency、Audit 與 Feature Flag
- 版本、Backward Compatibility、Migration、Rollback 與 Deprecation
- ADR Reference、Known Limitations 與未測試項目

不得因「很多 Application 都有」或「來源程式可運作」直接進 Platform Core。

## 降級與回滾

發生 Tenant Data Pollution、Security、Contract Incompatibility 或重大營運問題時，先停用 Feature Flag 或回滾版本，再由相同批准層級決定降級。記錄原因、影響、修復、Verification 與重新晉升條件。

## 狀態分離

- Lifecycle Status 表示治理成熟度。
- ADR Accepted 表示 Decision 已批准。
- Implemented 表示程式已完成。
- Verified 表示在指定 Scope 有證據。

四者不得互相推導。
