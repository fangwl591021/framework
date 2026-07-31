# Framework 2.0 Roadmap

This Roadmap records architecture intent only. `Not Implemented` and `Candidate` items are not authorized Runtime scope.

## A. Platform Core

| Capability | Purpose | Owns | Does Not Own | Dependencies | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Identity／Tenant／Authorization | Shared identity and Tenant access control | Identity mapping, membership, Permission evaluation | Business workflows | Runtime Foundation, D1 | P0 | Locally Implemented |
| Conversation Engine | Normalize multi-channel conversations | Conversation lifecycle and message context | Provider transport | Identity, Integration Hub | P1 | Not Implemented |
| Workflow Engine | Execute governed reusable processes | Workflow definition and state | Domain policy | Audit, Scheduler | P1 | Not Implemented |
| Knowledge Engine | Manage reusable governed knowledge | Knowledge lifecycle and access | AI inference | Identity, Configuration | P2 | Not Implemented |
| Analytics Engine | Produce reusable analytical facts | Metric definitions and aggregation | Billing decisions | Event data, Data Quality | P2 | Not Implemented |

## B. Business Engines

| Capability | Purpose | Owns | Does Not Own | Dependencies | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CRM Engine | Customer relationship capability | CRM domain records | Identity authority | Identity, Tenant | P1 | Not Implemented |
| Product Engine | Product and catalog capability | Product domain | Payments | Tenant | P1 | Not Implemented |
| Event Engine | Reusable event operations | Event, session, registration, check-in | Provider transport | Core, Module Gate | P0 | Candidate／Locally Verified |
| Booking Engine | Reusable booking capability | Booking domain | Calendar provider | Core, Scheduler | P2 | Not Implemented |
| Business Network Engine | Partner and commission network | Partner, attribution, commission | Payments | Core, Module Gate | P0 | Candidate／Locally Verified |
| Adaptive Communication Engine | Govern channel-aware communication | Communication policy | Provider transport | Conversation, Integration Hub | P2 | Not Implemented |
| AI Agent Engine | Govern reusable AI agents | Agent lifecycle and tools | Provider credentials | AI Gateway, Workflow | P2 | Not Implemented |

## C. Platform Services

| Capability | Purpose | Owns | Does Not Own | Dependencies | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AI Gateway and Intelligence Center | Govern AI routing and usage | Provider policy and usage evidence | Domain decisions | Configuration, Usage Metering | P2 | Not Implemented |
| Application Assembly／Module Enablement | Assemble Applications from Modules | Entitlement, enablement, Module Gate | Module domain data | Tenant, Authorization | P1 | Candidate／Not Implemented |
| Configuration Center | Govern environment and Tenant configuration | Configuration lifecycle | Secrets | Audit, Authorization | P1 | Not Implemented |
| Feature Flags | Govern controlled rollout | Flag lifecycle and evaluation | Release approval | Configuration | P2 | Not Implemented |
| Integration Hub | Govern provider adapters | Adapter registration and connection state | Provider business rules | Identity, Configuration | P1 | Not Implemented |
| Scheduler／Background Jobs | Govern asynchronous work | Job lifecycle and retry | Domain policy | Audit, Idempotency | P1 | Not Implemented |
| Observability／Diagnostics | Explain platform health | Metrics, traces, diagnostics | Business analytics | Runtime, Release Health | P0 | Planned PR #19 |
| Telegram Alerting | Deliver operational alerts | Alert adapter and delivery status | Incident decisions | Observability, Integration Hub | P1 | Planned PR #19 |
| Traffic Protection／Rate Limit／Circuit Breaker | Protect shared Runtime | Limits, breaker state, admission | Tenant billing | Runtime, Observability | P0 | Planned PR #20 |
| Data Quality Engine | Detect data integrity drift | Quality rules and findings | Automatic business correction | D1, Audit | P1 | Not Implemented |
| Usage Metering／Billing | Measure platform consumption | Usage facts and billing inputs | Payment collection | Analytics, Audit | P2 | Not Implemented |
| Backup／Recovery | Protect and restore data | Backup evidence and Restore Drill | Primary database semantics | D1, Storage providers | P0 | PR #18 Locally Implemented |
| Release／Rollback | Govern promotion and recovery | Release, Gates, rollback planning | Deployment provider | Build, Test, Backup | P0 | PR #18 Locally Implemented |

## D. Experience Layer

| Capability | Purpose | Owns | Does Not Own | Dependencies | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Conversational Workbench | Operate through conversation | Workbench experience | Conversation storage | Conversation, Workflow | P2 | Not Implemented |
| Interactive Flex Editor | Author channel content | Editor experience | LINE transport | Content, Integration Hub | P2 | Not Implemented |
| Guided Task Engine | Guide multi-step tasks | Guided interaction state | Domain mutation authority | Workflow, Authorization | P2 | Not Implemented |
| Floating AI Assistant | Contextual assistant experience | Assistant shell | AI provider | AI Gateway, Guided Tasks | P2 | Not Implemented |
| Browser Extension | Extend browser workflows | Extension shell | Core data authority | Public API, Authorization | P3 | Not Implemented |
| LINE／LIFF Entry | Provide LINE entry experience | Entry adapter | Core identity | Integration Hub, Identity | P2 | Not Implemented |
| Chrome／Edge; Firefox later | Supported extension targets | Compatibility policy | Browser stores | Browser Extension | P3 | Not Implemented |

## E. Domain Packs

| Capability | Purpose | Owns | Does Not Own | Dependencies | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Travel | Assemble travel capabilities | Pack configuration | Core Engines | Application Assembly | P2 | Not Implemented |
| Beauty | Assemble beauty capabilities | Pack configuration | Core Engines | Application Assembly | P2 | Not Implemented |
| Restaurant | Assemble restaurant capabilities | Pack configuration | Core Engines | Application Assembly | P2 | Not Implemented |
| Education／Association | Assemble education capabilities | Pack configuration | Core Engines | Application Assembly | P2 | Not Implemented |
| Employee Welfare | Assemble welfare capabilities | Pack configuration | Core Engines | Application Assembly | P2 | Not Implemented |
| LINE Marketing | Assemble LINE marketing capabilities | Pack configuration | LINE provider | Application Assembly, Integration Hub | P2 | Not Implemented |

## Delivery Sequence

1. PR #18 — Environment Separation／Release／Rollback／Backup／Restore.
2. PR #19 — Observability／Diagnostics／Telegram Alerting／Status Communication.
3. PR #20 — Traffic Protection／Webhook Deduplication／Rate Limit／Circuit Breaker／Tenant Resource Isolation.
4. Later candidates — AI Gateway and Usage Metering; Guided Task Engine／Floating Assistant; Conversational Workbench; Adaptive Communication Engine; Application Assembly Enhancement; Integration Setup Assistant.
