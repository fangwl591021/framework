# Credential Reference Model

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The pure model contains provider, provisioning state, nullable signature-key reference, nullable delivery-credential reference, and `containsCredentialValue=false`. References are bounded identifiers only; URLs, values, headers, tokens, and arbitrary metadata are rejected.

This package provides no secret provider, environment lookup, binding, injection path, rotation mechanism, or credential. Provisioning requires a separate Security-reviewed change and does not by itself enable the adapter.
