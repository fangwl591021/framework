# Decision Status Map

> Status snapshot based on Framework RC1 baseline commit `6dd23c30dd496a4892660c71b33349c2695ecb67`

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
- Physical Schema Execution（Architecture-reviewed Proposal 已在 `main`）
- Approved／Executed Migration
- Worker
- API
- Cloudflare Binding
- Deployment
- Production Verification

PR #6 已合併至 RC1 baseline；三項 Architecture Review Gate 均已通過。此狀態只代表 Physical Schema Proposal 已納入架構基準，仍未批准執行，且維持 Not Executed／Not Verified。

## Framework RC1／Migration Package Status

| Item | Document | Architecture | Execution | Verification |
| --- | --- | --- | --- | --- |
| Framework RC1 | Documentation Baseline | Frozen RC1 boundary | Not Applicable | Documentation reviewed in PR |
| Physical D1 Schema Proposal | On `main` | Gates 1～3 PASS | Not Approved／Not Executed | Not Verified |
| Approved Migration Package | Proposed Design | Not Approved | Not Approved／Not Executed | Local／Isolated Not Tested |
| A01～A06 | Test Plan Proposed | Pending | Not Executed | Not Verified |

詳細狀態見 [Package Status](../migration-package/00-PACKAGE-STATUS.md) 與 [Go／No-Go Decision](../migration-package/11-GO-NOGO-DECISION.md)。PR merge 不會把任何 Execution 或 Verification 狀態改為 Yes。

## QA Governance 狀態

| Item | Design | Approval | Implementation／Execution | Verification |
|---|---|---|---|---|
| QA Governance Foundation | Proposed | Not Approved | Not Implemented／Not Executed | Not Verified |
| PR #9 Migration Test Plan | Mapping Created：Yes（18 mapped／0 unmapped） | Test Plan Approved = No | Corrections Completed = No | Re-review Ready = No |

狀態來源見 [QA Governance Status](../qa-governance/00-QA-GOVERNANCE-STATUS.md) 與 [Migration Test Plan Mapping](../qa-governance/14-MIGRATION-TEST-PLAN-MAPPING.md)。Mapping Created 只代表追溯關係存在，不代表 Corrections Completed、Re-review Ready 或 Test Plan Approved；本 Sprint 不改變 PR #9 或 Migration Package 的任何批准與執行狀態。
