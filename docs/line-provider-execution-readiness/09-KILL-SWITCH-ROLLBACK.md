# Kill Switch and Rollback

Status: Lifecycle **Execution Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Provider Execution **Not Authorized**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Security Operator and Incident Commander are the only modeled kill-switch roles. Activation immediately yields disabled/no-dispatch state; evidence-write failure cannot block the safety action. Other roles fail closed.

Rollback requires an authorized Operations Owner, Security Operator, or Incident Commander, a known-safe configuration reference, and an independently valid rollback credential reference. It must disable the adapter first, restore deterministic local behavior without provider dependence, preserve Core Audit and idempotency, and never reactivate revoked credentials. This package tests the decision contract but executes no operational change.
