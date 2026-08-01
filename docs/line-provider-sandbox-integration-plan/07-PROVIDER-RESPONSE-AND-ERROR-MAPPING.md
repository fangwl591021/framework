# Provider Response and Error Mapping

Status: **Provider Sandbox Integration Plan Candidate; Real LINE Adapter Disabled; Provider, Canary, and Sandbox Entry Not Authorized; Connectivity Not Implemented; Fake Only; Credentials Not Provisioned; Credential References Contract Only; Public Webhook Not Created; Webhook Ingress Contract Only; Egress Allowlist Contract Only; api.line.me Access Prohibited; Remote D1 Not Used; Deployment Not Performed; Production Use Not Allowed; Workbench Only; NO-GO.**

Eight deterministic failure classes are allowed: timeout, rate limited, unavailable, invalid request, authentication failed, permission denied, invalid response, and unknown. Each maps to one stable reason code, bounded retry advice, `no_execution` or `deterministic_only` fallback, and a safe evidence class.

Raw provider bodies, headers, stack traces, credential material, request payloads, reply tokens, and upstream SDK errors are not part of the model. Authentication and permission failures require operator review; invalid requests and responses are never silently promoted to success; unknown failures fail closed.
