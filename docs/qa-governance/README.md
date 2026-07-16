# Framework QA Governance

This directory defines QA governance only.

It does not implement tests.
It does not execute tests.
It does not create environments.
It does not approve Migration execution.

本目錄提供跨 Module 的測試共同語言，以及 Migration、Runtime、Integration 共用的 Test、Fixture、Seed、Evidence、Coverage 與 Approval 標準。它不取代 Module Contract、Accepted ADR 或 Security Review。

## QA Source of Truth

Accepted ADR → Module Contract → Physical／Runtime Design → QA Governance Standard → Approved Test Plan → Executed Test Evidence → Approval Decision。

## Migration Test Plan Status Boundary

| Status | Value | Meaning |
| --- | --- | --- |
| Migration Test Plan Mapping Created | Yes | PR #9 的 18 項 Finding 已建立對應關係 |
| Migration Test Plan Corrections Designed | Yes — Pending Review | 已補足 catalog、control、evidence、recovery 與 query/index design |
| Migration Test Plan Corrections Completed | No | PR #9 尚未依 Mapping 完成修正 |
| Migration Test Plan Re-review Ready | No | 尚未具備重新提交 Architecture Review 的條件 |
| Test Plan Approved | No | 未取得 Test Plan Approval |

Mapping 是 traceability artifact，不是修正完成、重新審查準備完成或批准證據。

## Navigation

- [QA Governance Status](00-QA-GOVERNANCE-STATUS.md)
- [Test Case Standard](01-TEST-CASE-STANDARD.md)
- [Fixture／Seed Standard](02-FIXTURE-SEED-STANDARD.md)
- [Expected Result Standard](03-EXPECTED-RESULT-STANDARD.md)
- [Evidence Standard](04-EVIDENCE-STANDARD.md)
- [Coverage Model](05-COVERAGE-MODEL.md)
- [Concurrency／Replay Standard](06-CONCURRENCY-REPLAY-STANDARD.md)
- [Recovery／Reconciliation Standard](07-RECOVERY-RECONCILIATION-TEST-STANDARD.md)
- [Query／Index／Performance Standard](08-QUERY-INDEX-PERFORMANCE-TEST-STANDARD.md)
- [Security／Isolation Standard](09-SECURITY-ISOLATION-TEST-STANDARD.md)
- [Execution Lifecycle](10-TEST-EXECUTION-LIFECYCLE.md)
- [Evidence Review Workflow](11-TEST-EVIDENCE-REVIEW-WORKFLOW.md)
- [QA Approval Gates](12-QA-APPROVAL-GATES.md)
- [QA Readiness Checklist](13-QA-READINESS-CHECKLIST.md)
- [PR #9 Migration Mapping](14-MIGRATION-TEST-PLAN-MAPPING.md)
- [Module Test Library Template](15-MODULE-TEST-LIBRARY-TEMPLATE.md)
- [RC1 Migration Test Catalog](16-MIGRATION-TEST-CATALOG.md)
- [Migration Execution Control Plan](17-MIGRATION-EXECUTION-CONTROL-PLAN.md)
- [Query／Index Test Design](18-QUERY-INDEX-TEST-DESIGN.md)
- [Reusable Templates](templates/TEST-CASE-TEMPLATE.md)

本 Sprint 狀態僅為 Proposed；不授權 Test Implementation、Execution 或任何環境操作。
