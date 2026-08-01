# Local Verification

Status: Lifecycle **Isolated Verification Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Tests cover the published signature vector, raw-byte mutations, event mappings, empty-events 200 decision, replay/conflict, out-of-order timestamps, source/destination authority boundaries, reply-token lease states, fake transport failure classes, safe evidence, disabled state, and production isolation.

Validation runs unit and existing Local D1 regression tests, typecheck, production build, Local Demo build, dependency audit, diff checks, and bundle token scans. No local route, migration, Remote D1, provider request, binding, credential, or deployment is created.
