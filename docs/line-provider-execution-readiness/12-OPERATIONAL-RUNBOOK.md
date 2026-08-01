# Operational Runbook

Status: Lifecycle **Execution Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Provider Execution **Not Authorized**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Before a future execution proposal, operators must verify scoped approvals, account ownership, environment separation, credential lifecycle, exact egress targets, hard budget/quota ceilings, kill-switch reachability, rollback inputs, on-call coverage, evidence freshness, and privacy/retention policy. Any failure produces NO-GO.

During a suspected incident, disable first, prevent dispatch, preserve the original business result and Core Audit, classify safe evidence, and use the approved escalation reference. Recovery must re-evaluate every gate; it cannot infer authorization from a previous state. No command in this runbook is executable in the current phase.
