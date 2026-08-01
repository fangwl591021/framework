# Signature Verification

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

A future adapter must verify the signature using HMAC-SHA256 over the exact original UTF-8 request bytes before parsing, formatting, decoding escapes, or changing line endings. Missing or invalid signatures fail closed. The design follows the [official LINE signature-verification contract](https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/).

The Repository includes one synthetic local-only deterministic vector. Its fixture key is not a provider credential and is never used by production composition. No SDK or credential lookup is implemented.
