# Channel Adapter Foundation

Channel Adapter Foundation is a channel-neutral Platform Integration Service Candidate. It verifies inbound authenticity before parsing, normalizes bounded events, resolves trusted Core identities, applies replay and traffic guards, invokes the Conversational Workbench through a narrow bridge, renders capability-safe responses, and records immutable delivery evidence.

Status: Contract Approved by Tony after self-review; Architecture Review Approved; Security Review Approved; Locally Implemented; Locally Verified; Real Channel Adapters Disabled; Not Deployed; Production Use Not Allowed.

The only enabled adapter is `local_web_adapter` in local-only mode. LINE, Telegram, and generic webhook adapters are catalogued but disabled. No provider SDK, endpoint, credential, remote call, Remote D1, binding, or deployment is included.

## Reading path

1. [Channel Adapter Contract](01-CHANNEL-ADAPTER-CONTRACT.md)
2. [Inbound Event](02-INBOUND-EVENT.md)
3. [Authenticity Verification](03-AUTHENTICITY-VERIFICATION.md)
4. [Replay and Deduplication](04-REPLAY-DEDUP.md)
5. [Identity Resolution](05-IDENTITY-RESOLUTION.md)
6. [Channel Account](06-CHANNEL-ACCOUNT.md)
7. [Workbench Bridge](07-WORKBENCH-BRIDGE.md)
8. [Response Rendering](08-RESPONSE-RENDERING.md)
9. [Delivery Evidence](09-DELIVERY-EVIDENCE.md)
10. [LINE Future Adapter](10-LINE-FUTURE-ADAPTER.md)
11. [Telegram Future Adapter](11-TELEGRAM-FUTURE-ADAPTER.md)
12. [Local Channel Lab](12-LOCAL-CHANNEL-LAB.md)
13. [Security Boundary](13-SECURITY-BOUNDARY.md)
14. [Local Verification](14-LOCAL-VERIFICATION.md)
15. [Known Limitations](15-KNOWN-LIMITATIONS.md)

