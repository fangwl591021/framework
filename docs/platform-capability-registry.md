# Platform Capability Registry

This index separates architecture contracts, local implementation, verification, and production authority.

| Capability | Lifecycle | Implementation | Verification | Production authority |
| --- | --- | --- | --- | --- |
| Channel Adapter Foundation | Platform Integration Service Candidate | Locally Implemented | Locally Verified | Not Allowed |
| LINE Adapter Enablement Readiness | Readiness Candidate | Contracts and fixtures only | Locally Verified | Disabled; Not Approved |
| LINE Adapter Isolated Provider Verification | Isolated Verification Candidate | Pure verification harness and fake transport only | Locally Verified | Disabled; Not Approved |

The LINE readiness entry does not change `disabled_line_adapter`, create a provider connection, or grant Workbench/Domain authority. See [LINE Adapter Enablement Readiness](line-adapter-enablement-readiness/README.md).

The isolated verification entry validates official behavior mapping without a public webhook or provider connection. It keeps Provider Transport Fake Only and grants no Workbench, Domain, delivery, or Production authority. See [LINE Adapter Isolated Provider Verification](line-adapter-isolated-verification/README.md).
