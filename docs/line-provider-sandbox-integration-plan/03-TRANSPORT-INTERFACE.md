# Transport Interface

Status: **Provider Sandbox Integration Plan Candidate; Real LINE Adapter Disabled; Provider, Canary, and Sandbox Entry Not Authorized; Connectivity Not Implemented; Fake Only; Credentials Not Provisioned; Credential References Contract Only; Public Webhook Not Created; Webhook Ingress Contract Only; Egress Allowlist Contract Only; api.line.me Access Prohibited; Remote D1 Not Used; Deployment Not Performed; Production Use Not Allowed; Workbench Only; NO-GO.**

`LineSandboxTransportContract` is descriptive and non-executable. Its only accepted mode is `fake_only`; `networkEnabled`, `runtimeComposed`, and `providerExecutionAuthorized` must be false. Request and response bounds are positive and capped at 262,144 bytes.

The interface has no endpoint, model, SDK client, `fetch`, credential loader, binding, or execution method. Unknown fields fail closed with `TRANSPORT_CONTRACT_INVALID`. A future executable adapter requires a separate reviewed package and cannot implement this plan by silently adding a network function.
