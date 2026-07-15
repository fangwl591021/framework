# Module Contract Template

> 使用方式：複製本文件建立單一 Domain Module Contract。所有範例僅示範格式，不代表任何 Module 已 Implemented、Approved 或 Production Verified。

## 1. 基本資料

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Module Name | 必填 | 人類可讀名稱 | Example Capability Module |
| Module ID | 必填 | 唯一 kebab-case ID | example-capability |
| Purpose | 必填 | 解決問題與非目標 | 提供可組合的範例領域能力；不負責外部通道格式 |
| Business Capability | 必填 | 使用者或系統獲得的能力 | 管理某一類領域狀態與操作 |
| Lifecycle Status | 必填 | Idea／Candidate／Extracting／Experimental／Stable／Core Approved／Deprecated／Retired | Candidate |
| Owner | 必填 | Module Owner；未指定填 Unassigned | Unassigned |
| Version | 必填 | SemVer 或 N/A | N/A |
| Approval Status | 必填 | Draft／Reviewed／Approved／Rejected | Draft |

## 2. Dependencies

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Dependencies | 必填 | 必要 Platform Core／Domain Module 公開依賴與版本 | Platform Core Interface >= 1.0.0 |
| Adapter Dependencies | 必填 | 外部 Provider Adapter；無則填 None | None |
| Minimum Core Version | 選填 | 最低相容 Platform Core 版本 | N/A |
| Maximum Core Version | 選填 | 最高相容版本或未限制理由 | N/A |

不得列入其他 Module 的 private function、內部資料表或未版本化行為。

## 3. Public Interface

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Public Interfaces | 必填 | 其他 Module 唯一可依賴的版本化能力 | ExampleCapabilityService v1 |
| Commands | 必填 | 改變狀態的明確動作；無則填 None | PerformExampleAction |
| Queries | 必填 | 不改變狀態的查詢；無則填 None | GetExampleStatus |
| Domain Events Published | 必填 | 發布的已發生事實；無則填 None | ExampleActionCompleted |
| Domain Events Consumed | 必填 | 訂閱的已發生事實；無則填 None | None |

每個項目另附 Input、Output、Permission、Tenant Scope、Error Model、版本與 Idempotency 說明。本 Contract 不直接定義實際 API Endpoint。

## 4. Data Boundary

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Owned Data | 必填 | 本 Module 可直接建立、修改、刪除的資料概念 | Example Record |
| Read-only External Data | 必填 | 經公開 Query Interface 取得的外部資料 | Tenant Status summary |
| Tenant Boundary | 必填 | Tenant 隔離、Key、Query 與 Event 規則 | 所有狀態均限制於單一 Tenant |
| Shop Boundary | 必填 | Brand／Shop Scope；不適用需說明 | Optional Shop Scope |
| Migration Requirements | 必填 | Migration 與回滾需求；無則填 None | None during Candidate stage |

## 5. Configuration and Extension

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Configuration | 必填 | Key、型別、預設值、Scope、驗證與 Audit | `example_enabled`: boolean, default false |
| Policies | 必填 | 可替換決策規則；無則填 None | Eligibility Policy |
| Strategies | 必填 | 可替換演算法；無則填 None | Selection Strategy |
| Feature Flags | 必填 | Owner、Default、Scope、Expiration、Removal Plan | `module.example.enabled`, default off |
| Extension Points | 必填 | Hook、Policy、Strategy 或 Plugin Interface | AfterExampleCompleted Hook |

## 6. Permission and Security

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Permissions | 必填 | Actor、Action、Resource、Scope | Tenant Operator may manage Example Record |
| Security Classification | 必填 | Public／Internal／Confidential／Restricted | Internal |
| PII Handling | 必填 | 收集、遮罩、保留、刪除與權限 | No PII expected；若變更需重新審查 |
| Audit Requirements | 必填 | 必須記錄的敏感操作 | Record administrative changes |
| Idempotency Requirements | 必填 | Key、Scope、Expiration、Stored Result、Conflict | Tenant + Command + Request ID |

## 7. Reliability and Operations

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Error Model | 必填 | 公開錯誤、可重試性與敏感資訊限制 | Validation／Permission／Conflict／Dependency |
| Retry Policy | 必填 | 條件、次數、退避、死信與 Idempotency | Retry transient dependency errors only |
| Observability | 必填 | Metric、Trace、Log、Correlation ID 與 Alert | Success rate and latency metrics |
| Known Limitations | 必填 | 限制與未驗證事項 | Cross-project reuse not yet verified |

## 8. Testing Requirements

| 類型 | 必填／選填 | 驗證內容 | 狀態／證據 |
| --- | --- | --- | --- |
| Unit Test | 必填 | Policies、Strategies、Validation、Error Model | Not Started |
| Contract Test | 必填 | Public Interface 與相容性 | Not Started |
| Tenant Boundary Test | 必填 | 跨 Tenant 負面案例 | Not Started |
| Shop Boundary Test | 選填 | Brand／Shop Scope | N/A 或 Not Started |
| Security／PII Test | 必填 | Permission、遮罩、最小權限 | Not Started |
| Idempotency／Retry Test | 必填 | 重送、衝突與重試 | Not Started |
| Operational Test | 必填 | Observability、Feature Flag、回滾 | Not Started |

## 9. Compatibility and Lifecycle

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Backward Compatibility | 必填 | 相容承諾與 Breaking Change 規則 | Breaking changes require MAJOR and ADR |
| Deprecation Policy | 必填 | 公告、替代、期限與 Retired 條件 | Minimum one documented migration window |
| Stable Use Cases | 選填 | 兩個實質差異正式場景；非 Stable 填 None | None |
| ADR References | 選填 | 相關 Accepted／Proposed ADR | None |

## 10. Approval

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Module Owner Review | 必填 | Module Owner 的審查狀態 | Pending |
| Platform Architect Review | 必填 | Contract 與 Boundary 審查狀態 | Pending |
| Architecture Owner Approval | 必填 | 不需要、待批准、接受或拒絕 | Pending |
| Architecture Owner | 必填 | 重大批准的最終責任人 | Tony |
| Approval Date | 必填 | 未批准填 N/A；批准後填日期 | N/A |
| Approval Reference | 必填 | ADR、PR 或正式批准紀錄 | N/A |
| Implementation Status | 必填 | Not Implemented／In Progress／Completed | Not Implemented |
| Verification Status | 必填 | Not Verified／Partially Verified／Production Verified | Not Verified |

`Approval Status: Approved` 不代表 `Implementation Completed` 或 `Production Verified`。

## 11. Version History

Version History 為必填；每次 Contract 變更新增一列，不改寫既有歷史。

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Contract Version | 必填 | Contract 自身版本 | 0.1.0-draft |
| Date | 必填 | 變更日期 | YYYY-MM-DD |
| Author | 必填 | 文件變更者 | Example Author |
| Change | 必填 | 變更摘要 | Initial draft |
| Approval Reference | 必填 | 批准紀錄；草案填 N/A | N/A |

## 12. Open Questions

Open Questions 區域為必填；沒有問題時填 `None`，不得省略。

| 欄位 | 必填／選填 | 填寫說明 | 中性範例 |
| --- | --- | --- | --- |
| Question | 必填 | Contract 尚未決定的問題；無則填 None | 是否需要 Shop Scope？ |
| Decision Owner | 必填 | 有權決定的角色 | Architecture Owner |
| Needed By | 選填 | 需要 Decision 的日期或階段 | Before Experimental |
| Status | 必填 | Open／Resolved／Deferred | Open |
