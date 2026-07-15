# Framework QA Governance

This directory defines QA governance only.

It does not implement tests.
It does not execute tests.
It does not create environments.
It does not approve Migration execution.

本目錄提供跨 Module 的測試共同語言，以及 Migration、Runtime、Integration 共用的 Test、Fixture、Seed、Evidence、Coverage 與 Approval 標準。它不取代 Module Contract、Accepted ADR 或 Security Review。

## QA Source of Truth

Accepted ADR → Module Contract → Physical／Runtime Design → QA Governance Standard → Approved Test Plan → Executed Test Evidence → Approval Decision。

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
- [Reusable Templates](templates/TEST-CASE-TEMPLATE.md)

本 Sprint 狀態僅為 Proposed；不授權 Test Implementation、Execution 或任何環境操作。
