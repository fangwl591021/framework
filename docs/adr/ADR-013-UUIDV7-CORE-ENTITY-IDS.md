# ADR-013: Use UUIDv7 for Core Entity IDs

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
- 相關範圍：Runtime Phase 1 Core Entities

## 背景與問題

Framework 需要不依賴 Provider、Tenant 或資料庫自增序列的穩定 Domain ID。Internal ID Generator 原列為 Open Decision，會阻塞 Runtime 與 Migration 邊界。

## 限制條件

- ID 不得洩露客戶流水量或成為 External Identity。
- Application 可在 persistence 前產生 ID。
- 本 ADR 不選擇 library，不建立 Schema。

## 候選方案

1. Database sequential integer。
2. UUIDv4／`crypto.randomUUID()`。
3. UUIDv7。
4. ULID／CUID2。

## 方案比較

| 方案 | 優點 | 缺點／風險 | 可回滾性 |
| --- | --- | --- | --- |
| Sequential | 簡單 | 暴露順序、分散建立困難 | 低 |
| UUIDv4 | 平台支援容易 | 無時間排序性；不是選定格式 | 中 |
| UUIDv7 | 標準化、時間有序、可先產生 | 需要合規 generator 與 test vectors | 中 |
| ULID／CUID2 | 可排序或友善 | 非選定 UUID 標準；生態差異 | 中 |

## 最終決策

所有 Phase 1 Core Entity ID 使用 UUIDv7，由 Application／Domain Service 產生，未來 D1 以 `TEXT` 保存。Repository 與 D1 不產生 Domain ID；API 不使用流水號；`crypto.randomUUID()` 的 UUIDv4 不得冒充 UUIDv7。

## 影響與風險

- 支援在 persistence 之前建立穩定 Business Reference。
- 需要選定通過 RFC 相容性測試的 generator。
- UUIDv7 包含時間資訊，不得被當作安全 Token、排序授權或業務時間真相。

## 後續工作

- [x] Tony 核准本 ADR（Approved in PR #12）。
- [ ] Runtime PR 選定 generator 並加入 conformance／collision tests。
- [ ] Migration Proposal 只接受合法 UUIDv7 Domain IDs。

## 重新檢討條件

- 目標 Runtime 無法安全產生 UUIDv7。
- 法規或資料分區要求不同 ID namespace。

## 相關文件

- [Decision Closure](../runtime-phase-1/00-DECISION-CLOSURE.md)
- [Identity Core Contract](../runtime-phase-1/01-IDENTITY-CORE-CONTRACT.md)
