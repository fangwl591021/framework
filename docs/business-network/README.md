# Business Network Engine

Business Network Engine（商業網路引擎）是獨立、可重用的 Domain Module Candidate。它管理合作夥伴、商業關係、推薦觸點、銷售歸因、佣金與團隊查詢；不屬於 Platform Core。

## Status

| State | Value |
| --- | --- |
| Lifecycle | Candidate |
| Contract | Proposed／Pending Tony Approval |
| Implementation | Locally Implemented |
| Verification | Locally Verified |
| Deployment | Not Deployed |
| Production Use | Not Allowed |

## Documents

- [Module Contract](01-BUSINESS-NETWORK-ENGINE-CONTRACT.md)
- [Local Verification](02-LOCAL-VERIFICATION.md)
- [Permission and Data Boundary](03-PERMISSION-DATA-BOUNDARY.md)
- [Known Limitations](04-KNOWN-LIMITATIONS.md)
- [Registry Entry](../registry/business-network-engine.md)

本模組只重用 Core 的 UUIDv7、Tenant、Platform User、Membership、Permission、Audit 與 Idempotency 公開能力。它不改變任何 Core-owned lifecycle 或預設 Core Role grant。
