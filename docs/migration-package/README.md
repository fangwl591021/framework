# Approved Migration Package Design

This package never executes migrations.

It defines:
- Migration Governance
- Migration Safety
- Migration Approval
- Migration Test Evidence
- Migration Readiness
- Migration Go／No-Go

本 Package 只定義治理、安全邊界、核准流程、測試證據要求、Readiness 與 Go／No-Go 決策。它不是 Wrangler Migration 目錄，不含 DB Binding、Database ID、Wrangler Command、Production Identifier、真實帳號或真實資料。

## Package Navigation

1. [Package Status](00-PACKAGE-STATUS.md)
2. [Migration Dependency Order](01-MIGRATION-DEPENDENCY-ORDER.md)
3. [Local／Isolated D1 Test Strategy](02-LOCAL-ISOLATED-D1-TEST-STRATEGY.md)
4. [A01～A06 Negative Test Plan](03-A01-A06-NEGATIVE-TEST-PLAN.md)
5. [Constraint／Trigger／Atomicity Test Plan](04-CONSTRAINT-TRIGGER-ATOMICITY-TEST-PLAN.md)
6. [Rollback／Forward Fix Runbook](05-ROLLBACK-FORWARD-FIX-RUNBOOK.md)
7. [Reconciliation Runbook](06-RECONCILIATION-RUNBOOK.md)
8. [Architecture／Security／Execution Gates](07-ARCHITECTURE-SECURITY-EXECUTION-GATES.md)
9. [Migration Readiness Checklist](08-MIGRATION-READINESS-CHECKLIST.md)
10. [Environment Promotion Policy](09-ENVIRONMENT-PROMOTION-POLICY.md)
11. [Test Evidence Registry](10-TEST-EVIDENCE-REGISTRY.md)
12. [Go／No-Go Decision](11-GO-NOGO-DECISION.md)

## Authority Boundary

Package Design 被合併，不等於 Test Plan Approved、Tested、Architecture Approved、Security Approved、Execution Approved、Migration Executed 或 Post-Migration Verified。這些狀態必須分別留下證據。

## Source Baseline

- [Framework RC1](../releases/RC1.md)
- [Physical D1 Schema Overview](../52-PHYSICAL-D1-SCHEMA-OVERVIEW.md)
- [Documentation-only Migration Draft Safety](../schema/migrations/README.md)
