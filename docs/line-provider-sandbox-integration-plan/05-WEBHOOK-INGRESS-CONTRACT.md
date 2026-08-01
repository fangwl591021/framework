# Webhook Ingress Contract

Status: **Provider Sandbox Integration Plan Candidate; Real LINE Adapter Disabled; Provider, Canary, and Sandbox Entry Not Authorized; Connectivity Not Implemented; Fake Only; Credentials Not Provisioned; Credential References Contract Only; Public Webhook Not Created; Webhook Ingress Contract Only; Egress Allowlist Contract Only; api.line.me Access Prohibited; Remote D1 Not Used; Deployment Not Performed; Production Use Not Allowed; Workbench Only; NO-GO.**

The plan requires POST, original raw bytes, signature validation before parsing, replay protection, exact `application/json`, at most 1,048,576 body bytes, and at most 100 events. These are reviewable validation requirements only.

`publicRouteCreated` must remain false and ingress mode must remain `contract_only`. Route names, hostnames, bindings, handlers, secret resolution, provider callbacks, and runtime registration are prohibited. Missing signature/replay/raw-byte safeguards, unbounded inputs, additional content types, or unknown fields fail closed with `WEBHOOK_CONTRACT_INVALID`.
