# Sandbox Test Matrix

Status: **Provider Sandbox Integration Plan Candidate; Real LINE Adapter Disabled; Provider, Canary, and Sandbox Entry Not Authorized; Connectivity Not Implemented; Fake Only; Credentials Not Provisioned; Credential References Contract Only; Public Webhook Not Created; Webhook Ingress Contract Only; Egress Allowlist Contract Only; api.line.me Access Prohibited; Remote D1 Not Used; Deployment Not Performed; Production Use Not Allowed; Workbench Only; NO-GO.**

Local controls cover signature success/failure, stale timestamps, replay, bounded payloads, reply-token single use, credential-value rejection, exact egress allowlist, error mapping, kill-switch behavior, Workbench authority, and Production isolation.

Real-world prerequisites remain separately not run: provider-delivered webhook behavior, provider redelivery, provider outage, and operational rollback. Each evidence item has an exact case key, bounded reference, source class, status, verification bucket, and maximum age. Missing, failed, stale, duplicate, wrongly sourced, or unknown evidence fails closed. Synthetic complete records test evaluator behavior only and are not provider evidence.
