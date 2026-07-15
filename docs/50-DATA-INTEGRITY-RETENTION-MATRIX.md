# Data Integrity and Retention Matrix

> Logical Governance Matrix · Retention Periods Not Yet Approved

## Integrity Matrix

| Logical Record | Owner | Scope Guard | Uniqueness／Conflict Guard | History Rule | Cache Rule |
| --- | --- | --- | --- | --- | --- |
| Identity Mapping | Identity Center | Provider Context | Active Subject 不可指向多 User | Link／Unlink／Conflict 保留 | 不快取 Secret |
| Tenant Membership | Membership Engine | Tenant required | User＋Tenant 單一 Active | Suspend／Merge 保留 | D1 為真相 |
| Shop Membership | Membership Engine | Tenant＋Shop | Membership＋Shop 單一有效關係 | Revoke 保留 | 可重建讀取 Cache |
| Role Assignment | Permission Engine | Explicit Scope | 同 Assignment Policy 防重 | Grant／Revoke／Expire 保留 | 權限 Cache 需快速失效 |
| Point Ledger Entry | Point Engine | Tenant＋Account | Business／Idempotency Boundary＋Account Version | Grant／Deduct／Redeem／Expire／Single Full Reverse／Adjust | Balance 只由有效 Entry 重建；同 Idempotency Record最多一筆效果 |
| Referral Relationship | Referral Engine | Tenant required | 每 Membership 單一 Active Direct Referrer | Replace／Correct 保留 | 不作唯一真相 |
| Attribution Record | Attribution Engine | Tenant＋Conversion | 每 Conversion 單一 Active Decision | Correction 版本化 | Decision Cache 可回源 |
| Attendance Record | Attendance Engine | Tenant＋Subject | 依 Subject Policy 防重 | Correct／Revoke 保留 | 結果可回源 |
| Redemption Result | Redemption Engine | Tenant＋Shop＋Intent | Intent／Business Reference 防重 | Reverse／Correct 保留 | 不取代 Point Result |
| Idempotency Record | Core Candidate | Scope＋Operation | Key＋Fingerprint 單一 Winner | Stored Result 保留 | KV 非高價值唯一來源 |
| Audit Record | Core Candidate | Platform／Tenant | Append Identity | 不覆寫，依 Policy Archive | 不快取完整敏感內容 |

## Point Ledger and Failed Intent Matrix

| Outcome | Point Ledger Entry | 保存位置 | Balance Impact |
| --- | --- | --- | --- |
| Grant／Deduct／Redeem／Expire 已成立 | 建立正式 Entry | Point Ledger＋Idempotency Stored Result＋必要 Audit | 依有效 Entry 推導 |
| Single Full Reverse／Adjust 已成立 | 建立正式 Entry 並關聯 Original／Reason；同 Original最多一筆 Full Reverse | Point Ledger＋Idempotency Stored Result＋必要 Audit | 正式抵消或調整 |
| Insufficient Balance | 不建立 | Idempotency Record／Command Result／必要 Audit | 無 |
| Permission Denied／Scope Violation | 不建立 | Idempotency Record／Command Result／必要 Security Audit／Log | 無 |
| Duplicate Conflict／Expired／Invalid State／Validation Failure | 不建立 | Idempotency Record／Command Result／依用途 Log | 無 |

Rejected／Failed Attempt 與 Completed／Reversed Transaction 必須使用不同 Logical Record 與查詢語意；不得以 Point Transaction Status 將失敗嘗試混入財務型 Ledger。

## Logical Reference Rules

- Tenant Domain Reference 必須能驗證相同 Tenant；跨 Tenant Reference 預設拒絕。
- External Module Reference 需包含 Resource Type、Owner Module 與穩定 Business Reference，不能以顯示名稱猜測。
- Optional Shop／Brand 不存在時採 Tenant Scope，不建立虛構組織節點。
- Lifecycle 停用不自動 Cascade Delete 歷史；後續操作依 Owner Policy 拒絕或進人工處理。
- Correction／Reverse／Merge Chain 不可形成斷鏈或指向其他 Tenant。

## Retention Classes

| Class | 候選用途 | 決策要求 |
| --- | --- | --- |
| Identity Verification | Mapping Evidence、Conflict | Privacy、Recovery、Provider Policy |
| Membership History | Join／Suspend／Merge／Consent | Tenant Contract、Privacy、Audit |
| Financial-like Ledger | Point／Redemption | Reconciliation、Legal、Fraud、Accounting |
| Marketing Evidence | Share／Touch／Attribution | Consent、Campaign、Privacy、Dispute Window |
| Operational Transaction | Attendance／Idempotency | Retry、Dispute、Reconciliation |
| Security Audit | Permission／High-risk Change | Security Policy、Legal Hold、Access Review |

本 Sprint 不指定任何保存天數。每個 Application 必須由 Privacy Owner、Security Owner、Domain Owner 與適用法規共同決定，並記錄 Policy Version。

## Erasure／Anonymization／Archive

- **Erase**：僅在允許物理移除且不破壞 Ledger／Audit／法律義務時使用。
- **Anonymize**：移除可識別資料並保留不可逆 Reference 與必要交易關係。
- **Archive**：移出主要查詢路徑但仍受 Retention、Permission、Export 與 Legal Hold 管理。
- **Revoke／Deactivate**：停止未來使用，不等於刪除歷史。

任何流程都需記錄 Scope、Policy、Actor、Reason、Affected Record Classes、Before／After Count、Failure／Retry 與 Verification Evidence；實際批次、SQL 與 Storage 尚未設計。

## Physical Index Candidate Inputs

實體索引只能由已驗證 Access Pattern 決定。候選維度包括 Tenant、Owner Aggregate、Business Reference、Status、Occurred Time、Original Reference 與 Idempotency Boundary；本文件不批准索引名稱、順序或語法。

相關文件：[Tenant Data Boundary](15-TENANT-DATA-BOUNDARY.md)、[Duplicate, Merge and Migration](32-DUPLICATE-MERGE-MIGRATION.md)。
