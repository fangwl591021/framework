# Audit and Idempotency Logical Model

> Platform Core Candidate Logical Design · Not Implemented

Audit Log 與 Idempotency 仍是 Platform Core Candidate，不因本文件存在而成為 Approved、Stable 或 Runtime。兩者承接跨 Module 安全需求，但不擁有 Domain Transaction 本體。

## Idempotency Record

### Logical Content

- Tenant／Platform Scope
- Operation／Command Type
- Validated Key Reference
- Business／Target Reference
- Request Fingerprint
- Policy／Contract Version
- Processing Owner／Lease Reference
- Status：Processing、Completed、Failed Retryable、Failed Permanent、Conflict
- Safe Stored Result／Result Reference
- Started／Completed／Last Attempt Time
- Retry Count／Expiration／Retention Class
- Correlation／Audit Reference

### Constraints

- 相同 Scope＋Operation＋Key＋有效 Fingerprint 只有一個 Winner。
- 同 Key 不同有效 Fingerprint 為 Conflict，不執行第二個 Intent。
- Completed／Failed Permanent 重送回原 Stored Result；Failed Retryable 以同 Key 續處理。
- 高價值 Transaction 的防重不可只依短期 KV；D1 Candidate Record 是正式真相候選。
- Idempotency Record 不保存完整 Secret、Token、PII 或不必要 Payload。

## Audit Record

### Logical Content

- Audit Identity／Occurred Time
- Platform／Tenant／Brand／Shop Scope
- Actor Type／Actor Business Reference
- Action／Resource Type／Resource Reference
- Decision：Allowed、Denied、Changed、Corrected、Reversed、Approved
- Before／After Summary 或 Change Reference
- Reason／Policy／Contract Version
- Requester／Approver Reference
- Correlation／Command／Original Record Reference
- Evidence Reference、Security Classification、Retention Class

Audit 只保存最小必要摘要與 Reference，不複製整筆 Point Transaction、Provider Payload、完整 Profile 或 Secret。

## Separation of Responsibilities

| Concern | Domain Module | Idempotency Candidate | Audit Candidate |
| --- | --- | --- | --- |
| Business validation | Owner | 不負責 | 不負責 |
| Duplicate winner／Stored Result | 提供 Contract | 保存候選狀態 | 記錄重要衝突 |
| Transaction state | Owner Source of Truth | 只保存 Result Reference | 只保存 Decision／Change Reference |
| Permission decision | Permission／Owner | 納入 validated scope | 保存高風險允許／拒絕摘要 |
| Retention／PII | Owner 提供分類 | 依風險保留 | 依法規與 Audit Policy 保留 |

## Access and Security

- 一般 Tenant Operator 不得跨 Tenant 查詢 Idempotency 或 Audit。
- Audit Search 使用 Permission、Purpose、Time Range 與 Scope Filter；高風險匯出本身需 Audit。
- Actor Identity Erasure 後保留不可逆 Business Reference 或 Anonymized Actor，除非法律要求完整刪除。
- KV Cache 可加速低風險讀取，但不是 Idempotency Winner 或 Audit History 的唯一來源。

## Open Physical-design Questions

- 高競爭 Claim／Lease、Stuck Processing Recovery 與 D1 Transaction 策略。
- Fingerprint canonicalization、敏感欄位排除與版本相容。
- Audit partition、archive、export、legal hold 與 tamper evidence。
- 各交易類型的 Retention Period 與刪除批准流程。

相關文件：[Core Cross-cutting Candidates](21-CORE-CROSSCUTTING-CANDIDATES.md)、[Idempotency Standard](40-IDEMPOTENCY-STANDARD.md)、[Correction and Reversal](41-CORRECTION-REVERSAL-STANDARD.md)。
