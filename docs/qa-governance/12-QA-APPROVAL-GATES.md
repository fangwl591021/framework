# QA Approval Gates

| Gate | Approval Scope | Minimum Evidence |
| --- | --- | --- |
| Q1 — Test Design | traceability、case completeness | Test Case Standard |
| Q2 — Fixture／Seed | deterministic、isolated、cleanable | Fixture manifest |
| Q3 — Expected Result | precise before／action／after | assertion contract |
| Q4 — Evidence | reproducible、sanitized、retained | Evidence Standard |
| Q5 — Security／Isolation | tenant、PII、secret、target safety | Security review |
| Q6 — Recovery／Reconciliation | failure、repair、exit criteria | drill plan |
| Q7 — Execution Readiness | environment、operator、window、stop authority | execution approval |

角色為 Architecture Owner、Security Reviewer、Module Owner、Test Operator、Evidence Reviewer、Product Owner。Tony 預設只為 Architecture Owner，不自動兼任其他角色。


## Canonical Gate Names

正式名稱為 Gate Q1 — Test Design、Gate Q2 — Fixture／Seed、Gate Q3 — Expected Result、Gate Q4 — Evidence、Gate Q5 — Security／Isolation、Gate Q6 — Recovery／Reconciliation、Gate Q7 — Execution Readiness。
QA Governance Approval、Test Plan Approval、Test Execution Authorization、Evidence Acceptance 與 Production Approval 彼此獨立。任一 mandatory Gate 未通過即維持 NO-GO。
