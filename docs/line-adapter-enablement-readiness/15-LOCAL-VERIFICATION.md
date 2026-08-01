# Local Verification

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Local tests cover event allowlists and bounds, exact-byte synthetic signature vector, missing/invalid signature, timestamp and replay stability, reply-token lifecycle, capability degradation, deterministic rate/retry policy, outage, kill switch, credential reference validation, safe evidence, missing approvals, Workbench authority, and production isolation.

Verification uses pure TypeScript and Web Crypto. It creates no route, database, migration, remote request, provider account, credential, binding, or deployment. Passing tests means contract readiness only.
