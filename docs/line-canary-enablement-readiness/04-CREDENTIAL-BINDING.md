# Credential Binding

Status: Lifecycle **Canary Enablement Readiness Candidate**; Real LINE Adapter **Disabled**; Provider Execution **Not Authorized**; Canary Execution **Not Authorized**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Egress **Policy／Decision Only**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The binding stores only provider, environment, opaque binding/reference IDs, version, lifecycle state, and `containsSecretValue=false`. Values, tokens, headers, URLs, arbitrary metadata, and environment secret access are rejected.

Staging and Production references and bindings must differ. Expired, revoked, or unknown references and permit-version mismatch produce NO-GO. Rollback can expire a planned reference but never restores a revoked credential. No credential is provisioned by this package.
