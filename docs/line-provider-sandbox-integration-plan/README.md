# LINE Provider Sandbox Integration Plan

This review package defines the exact interfaces, validation rules, evidence, and gates required before any real LINE Provider sandbox work may be proposed. It creates no connectivity or execution authority.

## Canonical status

- Lifecycle: **Provider Sandbox Integration Plan Candidate**
- Real LINE Adapter: **Disabled**
- Provider Execution: **Not Authorized**
- Canary Execution: **Not Authorized**
- Provider Sandbox Entry: **Not Authorized**
- Provider Sandbox Connectivity: **Not Implemented**
- Provider Transport: **Fake Only**
- Credentials: **Not Provisioned**
- Credential References: **Contract Only**
- Public Webhook: **Not Created**
- Webhook Ingress: **Contract Only**
- Egress: **Allowlist Contract Only**
- api.line.me Access: **Prohibited**
- Remote D1: **Not Used**
- Deployment: **Not Performed**
- Production Use: **Not Allowed**
- Authority: **Workbench Only**
- Decision: **NO-GO**

## Reading order

1. [Scope and non-goals](01-SCOPE-AND-NON-GOALS.md)
2. [Sandbox architecture](02-SANDBOX-ARCHITECTURE.md)
3. [Transport interface](03-TRANSPORT-INTERFACE.md)
4. [Credential reference contract](04-CREDENTIAL-REFERENCE-CONTRACT.md)
5. [Webhook ingress contract](05-WEBHOOK-INGRESS-CONTRACT.md)
6. [Egress allowlist contract](06-EGRESS-ALLOWLIST-CONTRACT.md)
7. [Provider response and error mapping](07-PROVIDER-RESPONSE-AND-ERROR-MAPPING.md)
8. [Sandbox test matrix](08-SANDBOX-TEST-MATRIX.md)
9. [Entry and exit criteria](09-ENTRY-AND-EXIT-CRITERIA.md)
10. [Security, Privacy, and Operations gates](10-SECURITY-PRIVACY-OPERATIONS-GATES.md)
11. [Explicit decision record](11-EXPLICIT-DECISION-RECORD.md)
12. [Local verification](12-LOCAL-VERIFICATION.md)

The package references the canonical state established by the [LINE Enablement Consolidation Review](../line-enablement-consolidation-review/README.md). It does not duplicate the earlier readiness engines or alter `disabled_line_adapter`.
