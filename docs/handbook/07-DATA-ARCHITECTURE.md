# Data Architecture

> `main` 正式基準：Framework RC1 · Logical Model · Physical Schema Proposal

## Current Status

```text
Logical Model: On main.
Physical D1 Schema Proposal: On main; Architecture Gates 1–3 Passed.
Schema Execution: Not Executed.
D1 Verification: Not Verified.
Migration Execution Approval: Not Granted.
```

PR #6 已合併，但其核准範圍只限 Physical Schema Proposal 的 Architecture Boundary，不代表 SQL、D1 或 Migration 可執行。下一階段由 [Approved Migration Package](../migration-package/README.md) 分別管理 Test、Security 與 Execution Gate；目前決策仍為 NO-GO。

## Logical Data Principles

| Concept | Meaning | Official Source |
| --- | --- | --- |
| D1 Source of Truth | 保存需要關聯、一致性、歷史與稽核的正式資料 | [ADR-002](../adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md) |
| KV Cache | 可移除、可回源、容忍短暫延遲的讀取加速 | [Database Standard](../05-DATABASE-STANDARD.md) |
| Logical Record | 語意、Owner、Scope、History；不是 Table／Column | [D1 Logical Model](../44-D1-LOGICAL-DATA-MODEL.md) |
| Owner Module | 唯一可直接修改該 Domain Data 的 Module | [Contract Standard](../19-MODULE-CONTRACT-STANDARD.md) |
| Tenant Scope | Tenant Domain Record 必須可直接判定 Scope | [Tenant Boundary](../15-TENANT-DATA-BOUNDARY.md) |
| History Rule | Reverse／Correct／Replace／Merge／Anonymize 保留關聯 | [Integrity Matrix](../50-DATA-INTEGRITY-RETENTION-MATRIX.md) |
| Business Reference | 跨 Module 的穩定來源識別，不使用 Provider UID | [Transaction Safety](../39-TRANSACTION-SAFETY-STANDARD.md) |
| Idempotency Record | Winner、Fingerprint、Stored Result、Retry／Conflict 候選 | [Logical Model](../49-AUDIT-IDEMPOTENCY-LOGICAL-MODEL.md) |
| Audit Record | 最小必要 Decision／Change Evidence，不是 Domain Record | [Core Candidates](../21-CORE-CROSSCUTTING-CANDIDATES.md) |

## Ledger 與 Projection

- Point Ledger 只保存已成立的 Grant、Deduct、Redeem、Expire、Reverse、Adjust。
- Failed Intent 不建立 Point Transaction，由 Stored Result／Command Result／必要 Audit 承接。
- Balance Projection 與 KV 都必須可由有效 Ledger Entry 重建。
- Projection drift 使用 Reconciliation；不得直接改 Ledger 修正。

詳見 [Point Ledger Logical Model](../46-POINT-LEDGER-LOGICAL-MODEL.md)。

## Retention、Privacy、Merge

Retention period 尚未批准。Erase、Anonymize、Archive、Revoke 是不同操作；Identity Merge 必須保留 Case、Evidence 與 Chain，不因 PII erasure 破壞必要 Ledger／Audit 關聯。正式問題清單見 [Data Integrity／Retention Matrix](../50-DATA-INTEGRITY-RETENTION-MATRIX.md) 與 [Duplicate／Merge／Migration](../32-DUPLICATE-MERGE-MIGRATION.md)。

任何 Physical Schema 工作都必須先通過 [Schema Implementation Readiness Checklist](../51-SCHEMA-IMPLEMENTATION-READINESS-CHECKLIST.md)。
