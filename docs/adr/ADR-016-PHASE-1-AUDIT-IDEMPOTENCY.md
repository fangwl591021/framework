# ADR-016: Require Audit and Idempotency as Phase 1 Cross-cutting Infrastructure

## 基本資料

- 狀態：Accepted
- 日期：2026-07-30
- 決策人：Tony
- Architecture Owner Approval：Accepted by Tony
- Approval Date：2026-07-30
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Supersedes：None
- Superseded By：None
- 相關範圍：Core Operations and all Phase 1 mutations

## 背景與問題

Identity Linking、Membership、Role Assignment 與 Tenant mutations 都需要防止重複效果並留下最小決策證據。若將兩者延後，每個 Module 會建立不相容的重送與 Audit 行為。

## 候選方案

1. 每個 Module 自行處理。
2. Phase 1 不支援安全重送與 Audit。
3. 建立 Core Operations cross-cutting contract。

## 方案比較

| 方案 | 優點 | 缺點／風險 | 可回滾性 |
| --- | --- | --- | --- |
| Per-module | 局部快速 | 語意與安全分歧 | 低 |
| Deferred | 範圍小 | Mutation 無法安全開放 | 低 |
| Core contract | 統一 Stored Result、Audit、Correlation | 增加基礎設施範圍 | 高 |

## 最終決策

Phase 1 將 `idempotency_records` 與 `audit_records` 納入 logical scope。Identity Linking、Membership Mutation、Role Assignment Mutation 與 Tenant Mutation 都必須使用一致 Contract。

同 Key／同 Fingerprint 回安全 Stored Result；同 Key／不同 Fingerprint 拒絕。`in_progress` 具 timeout、takeover 與 stale-owner fencing。Audit 只保存最小 Actor／Action／Resource／Scope／Result／Reason／Correlation evidence，不保存完整 Payload、Secret、Token 或 raw Provider Subject。

## 影響與風險

- Mutation 可用一致方式處理 unknown result 與 retry。
- Retention、size limit、fingerprint canonicalization 與 fencing physical design 仍未決。
- Audit 失敗與 Domain mutation 的 atomic boundary 需要後續 Transaction Design。

## 後續工作

- [x] Tony 核准本 ADR（Approved in PR #12）。
- [ ] Security／Privacy Owner 核准 retention 與 Stored Result filtering。
- [ ] Migration／Runtime PR 分別提出 physical 和 executable design。

## 重新檢討條件

- 未來 Infrastructure 提供具同等 scope、fencing、Stored Result 與 Audit evidence 的核准能力。

## 相關文件

- [Core Operations Contract](../runtime-phase-1/04-CORE-OPERATIONS-CONTRACT.md)
- [Idempotency Standard](../40-IDEMPOTENCY-STANDARD.md)
