# Safe Evidence

Status: Lifecycle **Isolated Verification Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Evidence is immutable and bounded to lifecycle, disabled adapter key, fake transport class, webhook event ID, normalized provider event type, replay disposition, redelivery flag, short payload-digest prefix, reason code, support code, and `networkUsed=false`.

It excludes destination, Tenant/Application authority, raw payload, message content, postback data, raw UID, reply token, signature, fixture key, credential, endpoint, header, SQL, stack, and provider response. It is local verification evidence, not Core Audit and not a provider delivery receipt.
