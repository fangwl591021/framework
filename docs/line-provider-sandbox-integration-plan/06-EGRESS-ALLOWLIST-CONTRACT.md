# Egress Allowlist Contract

Status: **Provider Sandbox Integration Plan Candidate; Real LINE Adapter Disabled; Provider, Canary, and Sandbox Entry Not Authorized; Connectivity Not Implemented; Fake Only; Credentials Not Provisioned; Credential References Contract Only; Public Webhook Not Created; Webhook Ingress Contract Only; Egress Allowlist Contract Only; api.line.me Access Prohibited; Remote D1 Not Used; Deployment Not Performed; Production Use Not Allowed; Workbench Only; NO-GO.**

The allowlist is symbolic and exact: HTTPS, port 443, POST only, a fixed provider-host reference, and bounded allowlisted path references. Wildcards, redirects, URLs, arbitrary hosts, arbitrary methods, duplicate paths, and client overrides are rejected.

`networkEnabled` remains false and mode remains `allowlist_contract_only`. No DNS resolution, HTTP client, endpoint, API access, or transport wiring exists. api.line.me access remains prohibited until an independently approved egress implementation and sandbox-entry decision exist.
