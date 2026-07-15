# Decision Status Map

> Status snapshot based on `main` at `b78d48f942e0dc8994426ee14787574e2be9bf68`

## Accepted ADR

| ADR | Decision | Status | Implementation | Verification | Official Link |
| --- | --- | --- | --- | --- | --- |
| ADR-001 | Platform User 與 Tenant Membership 分離 | Accepted | Not Implemented | Not Verified | [ADR-001](../adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md) |
| ADR-002 | D1 為 Source of Truth，KV 為 optional Cache | Accepted | Not Implemented | Not Verified | [ADR-002](../adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md) |
| ADR-003 | 初期採 Modular Monolith Worker | Accepted | Not Implemented | Not Verified | [ADR-003](../adr/ADR-003-MODULAR-MONOLITH-WORKER.md) |
| ADR-004 | Tenant 必要，Brand／Shop 選用 | Accepted | Not Implemented | Not Verified | [ADR-004](../adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md) |
| ADR-005 | Referral 與 Attribution 分離 | Accepted | Not Implemented | Not Verified | [ADR-005](../adr/ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md) |
| ADR-006 | Point Account 採 Tenant Membership Scope | Accepted | Not Implemented | Not Verified | [ADR-006](../adr/ADR-006-TENANT-SCOPED-POINT-ACCOUNTS.md) |
| ADR-007 | Referral 預設 Single-Layer | Accepted | Not Implemented | Not Verified | [ADR-007](../adr/ADR-007-SINGLE-LAYER-REFERRAL-DEFAULT.md) |
| ADR-008 | External Identity 不作 Business Key | Accepted | Not Implemented | Not Verified | [ADR-008](../adr/ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md) |
| ADR-009 | 餘額不足整筆拒絕 | Accepted | Not Implemented | Not Verified | [ADR-009](../adr/ADR-009-REJECT-INSUFFICIENT-POINT-BALANCE.md) |
| ADR-010 | First Valid Referrer | Accepted | Not Implemented | Not Verified | [ADR-010](../adr/ADR-010-FIRST-VALID-REFERRER.md) |
| ADR-011 | First Valid Touch／30-Day default | Accepted | Not Implemented | Not Verified | [ADR-011](../adr/ADR-011-DEFAULT-FIRST-TOUCH-ATTRIBUTION.md) |
| ADR-012 | 完成交易 Reverse／Correct，不 Delete | Accepted | Not Implemented | Not Verified | [ADR-012](../adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md) |

Accepted 表示 Decision 已批准，不表示其 Runtime／Schema 已存在。

## Platform Core Candidates

| Candidate | Lifecycle | Core Approval | Implementation | Verification |
| --- | --- | --- | --- | --- |
| Audit Log | Candidate | Not Approved | Not Implemented | Not Verified |
| Feature Flag | Candidate | Not Approved | Not Implemented | Not Verified |
| Idempotency | Candidate | Not Approved | Not Implemented | Not Verified |
| Module Registry | Candidate | Not Approved | Not Implemented | Not Verified |

正式邊界見 [Core Cross-cutting Candidates](../21-CORE-CROSSCUTTING-CANDIDATES.md)。

## Candidate Modules with Proposed Contracts

| Module | Lifecycle | Contract | Implementation | Verification | Registry |
| --- | --- | --- | --- | --- | --- |
| Point | Candidate | Contract Proposed | Not Implemented | Not Verified | [Registry](../registry/point-engine.md) |
| Referral | Candidate | Contract Proposed | Not Implemented | Not Verified | [Registry](../registry/referral-engine.md) |
| Attribution | Candidate | Contract Proposed | Not Implemented | Not Verified | [Registry](../registry/attribution-engine.md) |
| Attendance | Candidate | Contract Proposed | Not Implemented | Not Verified | [Registry](../registry/attendance-engine.md) |
| Redemption | Candidate | Contract Proposed | Not Implemented | Not Verified | [Registry](../registry/redemption-engine.md) |

## Not Implemented

- Runtime
- Physical Schema on `main`
- Migration
- Worker
- API
- Cloudflare Binding
- Deployment
- Production Verification

Sprint 7 Physical Proposal 仍在 [Draft PR #6](https://github.com/fangwl591021/framework/pull/6)，未合併、未批准、未執行。
