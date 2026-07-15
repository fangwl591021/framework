# Idempotency Standard

> Platform Core Candidate Standard · Implementation Technology Not Decided

## Required Use Cases

LINE／Payment Webhook、Attendance Submission、Point Grant／Deduct、Redemption、Conversion Registration、Attribution Evaluation、Referral Confirmation、Import／Migration Command 都必須定義 Idempotency Boundary。

## Key Sources

可由 Provider Event ID、Business Reference、Command ID、Signed Request ID，或 `Tenant + Operation + External Reference` 組成。Key 必須經 Server 驗證並綁定 Tenant／Operation／Target／Policy Version。

不得只用 Timestamp、Member ID、IP、易碰撞短隨機值，也不得讓未驗證 Client 決定完整 Scope。

## Idempotency Record Concept

| Concept | Requirement |
| --- | --- |
| Key / Scope | Tenant、Operation、Business Reference、必要 Rule Version |
| Request Fingerprint | 偵測同 Key 不同有效 Payload |
| Status | Processing、Completed、Failed Retryable、Failed Permanent、Conflict |
| Stored Result | 成功／失敗的安全回應摘要與 Result Reference |
| Started／Completed At | 可判定 stuck processing，不作唯一 Key |
| Expiration／Retention | 依交易風險；高價值交易不得只用短期 expiration |
| Correlation / Audit | 連結 Command、Actor、Result、Retry History |

## Duplicate and Conflict Behavior

- 相同 Key、相同有效 Request：Processing 回處理中；Completed 回原結果；Failed Retryable 依 Contract 同 Key 重試；Failed Permanent 回原失敗。
- 相同 Key、不同有效 Request：標示 Conflict，不執行第二次。
- 重複成功 Request 不得再次建立 Point、Attendance、Redemption、Referral 或 Attribution。

## Concurrency and Retry

- Contract 必須說明競爭中的唯一 Winner、Processing Timeout、Owner、Retry 與 Reconciliation。
- Retry 必須沿用原 Key；產生新 Key 等同新 Intent，需新 Business Reference 或明確操作。
- Provider timeout 不代表交易失敗；先 Query Stored Result／Business State，再決定 Retry。

## Candidate Storage Choices

- D1 可作長期 Idempotency Record Source of Truth。
- Durable Object 可處理特定高競爭序列化需求。
- KV 不適合作為高價值交易唯一防重來源。
- 本 Sprint 不決定 Storage；實作選擇需另立 ADR、容量與失敗分析。

## Governance

Idempotency 目前是 Platform Core Candidate，Not Implemented、Not Verified。每個 Module Contract 必須定義 Key、Scope、Retention、Stored Result、Conflict、Retry、Audit、PII Classification 與 Migration Concern。
