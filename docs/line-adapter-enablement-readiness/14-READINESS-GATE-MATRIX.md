# Readiness Gate Matrix

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

| Gate | Current state | Required before enablement |
| --- | --- | --- |
| Contract | Locally defined | Architecture acceptance |
| Signature vectors | Local deterministic only | Provider and rotation vectors |
| Replay/timestamp | Local verified | Isolated transport verification |
| Security and privacy | Not approved for execution | Separate approvals |
| Credentials | Not provisioned | Governed reference and rotation |
| Outage and rollback | Planned/local | Isolated drills |
| Operations and cost | Not approved | Owners, limits, evidence |
| Production execution | Not approved | Explicit final approval |

The evaluator always returns **NO-GO** in this package. No merge, test, or documentation state can automatically enable LINE.

Approval order is contract review → Architecture → Security/Privacy → credential provisioning → isolated shadow verification → Operations/Cost → Production Execution. Role separation and expiring approval evidence must be defined in the future implementation PR.
