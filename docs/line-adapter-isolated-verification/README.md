# LINE Adapter Isolated Provider Verification

This package validates the previously approved readiness contracts against published LINE Messaging API behavior using exact-byte signature vectors, deterministic provider fixtures, a provider transport port, a fake transport, an in-memory reply-token lease, and a local-only verification harness. It does not create a real provider integration.

Status: Lifecycle **Isolated Verification Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

## Reading path

1. [Scope and Non-Goals](01-SCOPE-AND-NON-GOALS.md)
2. [Official Behavior Mapping](02-OFFICIAL-BEHAVIOR-MAPPING.md)
3. [Signature Vectors](03-SIGNATURE-VECTORS.md)
4. [Webhook Normalization](04-WEBHOOK-NORMALIZATION.md)
5. [Redelivery and Ordering](05-REDELIVERY-AND-ORDERING.md)
6. [Reply-token Lease](06-REPLY-TOKEN-LEASE.md)
7. [Fake Transport](07-FAKE-TRANSPORT.md)
8. [Safe Evidence](08-SAFE-EVIDENCE.md)
9. [Local Verification](09-LOCAL-VERIFICATION.md)
10. [Enablement Gaps](10-ENABLEMENT-GAPS.md)
