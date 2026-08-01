# Authority Boundary Matrix

Status: **Consolidation Review Candidate; Real LINE Adapter Disabled; Provider and Canary Execution Not Authorized; Provider Sandbox Entry Not Authorized; Fake Only; Credentials Not Provisioned; Public Webhook Not Created; Remote D1 Not Used; Deployment Not Performed; Production Use Not Allowed; Workbench Only Authority.**

| Decision | Sole authority | LINE phases | Consolidation review |
|---|---|---|---|
| Intent resolution | Workbench | None | Observe only |
| Confirmation | Workbench | None | Observe only |
| Permission | Workbench/Core Authorization | None | Observe only |
| Mutation | Workbench/domain service | None | Observe only |
| Provider execution | Not authorized | Policy only | Deny |
| Canary execution | Not authorized | Policy only | Deny |
| Sandbox entry | Not authorized | Evidence only | NO-GO |

Any duplicated authority claim is a blocking contradiction. Channel or LINE layers may normalize and render bounded messages, but they cannot create intent, confirm actions, grant permission, or execute mutations.
