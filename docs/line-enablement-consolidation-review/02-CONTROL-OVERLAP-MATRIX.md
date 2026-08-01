# Control Overlap Matrix

Status: **Consolidation Review Candidate; Real LINE Adapter Disabled; Provider and Canary Execution Not Authorized; Provider Sandbox Entry Not Authorized; Fake Only; Credentials Not Provisioned; Public Webhook Not Created; Remote D1 Not Used; Deployment Not Performed; Production Use Not Allowed; Workbench Only Authority.**

| Control | Definition source | Verification source | Consolidated owner |
|---|---|---|---|
| Event contract, signature, replay | Adapter Readiness | Isolated Verification | Channel Adapter Foundation |
| Reply token, capability, degradation | Adapter Readiness | Isolated Verification | Channel Adapter Foundation |
| Provider lifecycle, credential reference, egress | Provider Execution Readiness | Local policy fixtures | Provider governance; no execution owner |
| Canary cohort, promotion, rollback | Canary Readiness | Local deterministic fixtures | Canary governance; no execution owner |
| Evidence inventory and decision | All four phases | Consolidation tests | Consolidation Review |

Repeated coverage is an intentional definition/verification/governance chain. Two canonical owners, identical duplicate claims, or any claim of Provider, Canary, or Workbench authority outside its accepted owner are blocking findings.
