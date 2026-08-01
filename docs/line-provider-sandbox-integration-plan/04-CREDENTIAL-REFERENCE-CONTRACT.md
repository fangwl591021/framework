# Credential Reference Contract

Status: **Provider Sandbox Integration Plan Candidate; Real LINE Adapter Disabled; Provider, Canary, and Sandbox Entry Not Authorized; Connectivity Not Implemented; Fake Only; Credentials Not Provisioned; Credential References Contract Only; Public Webhook Not Created; Webhook Ingress Contract Only; Egress Allowlist Contract Only; api.line.me Access Prohibited; Remote D1 Not Used; Deployment Not Performed; Production Use Not Allowed; Workbench Only; NO-GO.**

Only `channel_secret` and `channel_access_token` reference classes are modeled. A reference uses a bounded `secret-ref:<name>` identifier, positive version, `provider_sandbox` environment, `planned` lifecycle, trusted-governance source, and `containsSecretValue=false`.

Secret, token, credential, value, or authorization fields are rejected with `CREDENTIAL_VALUE_PROHIBITED`. Duplicate classes, active lifecycle, Production environment, unknown fields, and malformed references fail closed. No provider integration resolves these references in this phase.
