# Roadmap

> Roadmap 是候選順序，不代表已批准自動執行

## 已建立的文件階段

| Stage | Result | Runtime／Verification Status |
| --- | --- | --- |
| Sprint 1 — Framework Foundation | Vision、Blueprint、Standards | Not Implemented／Not Verified |
| Sprint 2 — Governance | Layers、Lifecycle、Ownership、Promotion | Not Implemented／Not Verified |
| Sprint 3 — Architecture Contracts | Contract／Registry／Core Candidate Governance | Not Implemented／Not Verified |
| Sprint 4 — Identity／Membership／Attribution | Domain Models、Invariants、ADR | Not Implemented／Not Verified |
| Sprint 5 — Transaction Engine Contracts | 五個 Candidate Contract、Safety、Scenarios | Not Implemented／Not Verified |
| Sprint 6 — Logical D1 Data Model | Logical Records、Integrity／Retention、Readiness Gate | No Physical Schema／Not Verified |
| Sprint 7 — Physical Schema Proposal | PR #6 已合併；Architecture Gates 1～3 Passed | Architecture-reviewed Proposal／Not Executed／Not Verified |
| Architecture Handbook | 本次導航與共同理解入口 | Documentation Only |

## 後續候選

```text
Framework RC1 Baseline
→ Migration Package Test Design Review
→ Local D1 Test Approval
→ Isolated D1 Test Approval
→ Architecture／Security／Execution Gates
→ Runtime Foundation（另案）
→ D1 Migration（另案核准）
→ Module Implementation
→ Integration Tests
→ Staging Verification
→ Production Readiness
```

每一步仍需自己的 Scope、Preflight、Approval、Validation 與 PR。Migration、Runtime、D1、Deployment 或 Production Access 不因 Roadmap 存在而獲得授權。

## RC1 Baseline and Migration Package

| Stage | Current Result | Authorization |
| --- | --- | --- |
| Framework RC1 | Architecture／Documentation baseline proposed in this Sprint | No tag／release without separate approval |
| Migration Package Design | 12 numbered governance documents plus README | Design only |
| Test Design Review | Next decision | Not Approved |
| Local／Isolated D1 Test | Future controlled stage | Not Authorized |
| Staging／Production Migration | Future independent stage | Not Authorized |

Promotion 必須依 [Environment Promotion Policy](../migration-package/09-ENVIRONMENT-PROMOTION-POLICY.md) 逐階段完成；目前 [Go／No-Go](../migration-package/11-GO-NOGO-DECISION.md) 為 NO-GO。

## QA Governance 路徑

| Stage | Purpose | Current Status |
|---|---|---|
| QA Governance Foundation | 建立共同標準、Template 與 Gate | Proposed |
| QA Governance Review | 核准標準與具名責任 | Pending |
| PR #9 Finding Mapping | 對應 18 項 Finding 與 QA Standard | Created：18 mapped／0 unmapped |
| PR #9 Corrections | 依 Mapping 修正 Migration Test Plan | Not Completed |
| PR #9 Re-review | 重新提交 Migration Test Plan Approval | Not Ready／NO-GO |
| Test Library Implementation | 建立可執行測試資產 | Not Started／Not Authorized |
| Local／Isolated Execution | 產生受控證據 | Not Started／Not Authorized |

每一階段都需獨立核准；Mapping Created 不會自動推導 Corrections Completed、Re-review Ready 或 Test Plan Approved。
