# Channel Adapter Foundation Registry Entry

| Field | Value |
| --- | --- |
| Module Key | `channel-adapter-foundation` |
| Type | Platform Integration Service |
| Contract | Approved by Tony after self-review |
| Lifecycle | Candidate |
| Architecture Review | Approved |
| Security Review | Approved |
| Implementation | Locally Implemented |
| Verification | Locally Verified |
| Real Channel Adapters | Disabled |
| Deployment | Not Deployed |
| Production Use | Not Allowed |

## Dependencies

Identity Core, Tenant Access, Authorization, Core Operations, Application Assembly, Platform Traffic Protection, Platform Observability, and Conversational Workbench remain authoritative for their respective responsibilities.

## Exports

Channel catalog and account contracts, authenticity verifier port, normalized inbound event, identity resolver boundary, replay-safe delivery coordinator, Workbench bridge, safe response renderer, delivery evidence, and Local Channel Lab composition.

## Forbidden ownership

Tenant authority, Core identity ownership, Domain permission evaluation, Workbench intent authority, business mutation, provider credential management, provider SDK calls, Remote D1, and deployment.
