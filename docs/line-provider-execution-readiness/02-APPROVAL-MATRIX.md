# Approval Matrix

Status: Lifecycle **Execution Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Provider Execution **Not Authorized**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

| Required approval | Responsibility |
| --- | --- |
| Architecture | Adapter boundary, authority separation, failure isolation |
| Security | credential reference, signature, egress, kill switch |
| Privacy | data minimization, retention, deletion authority |
| Cost | hard budgets, quotas, alerts, financial owner |
| Operations | on-call, provider ownership, incident and rollback drills |
| Execution | explicit environment- and scope-bound permission to execute |

Each record is server-owned, bounded, immutable evidence with approval kind, decision, scope reference, approver role, issue and expiry times, and safe evidence reference. Missing, expired, revoked, duplicated, untrusted, or scope-mismatched evidence is a blocker. Approval comments and attachments are never copied into runtime evidence. Passing all six entries still does not grant execution in this package.
