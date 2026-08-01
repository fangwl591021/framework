# Signature Vectors

Status: Lifecycle **Isolated Verification Candidate**; Real LINE Adapter **Disabled**; Provider Transport **Fake Only**; Credentials **Not Provisioned**; Public Webhook **Not Created**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

The official published empty-events example is included verbatim as a test vector: original UTF-8 body bytes, published sample key, and expected Base64 HMAC-SHA256 signature. The published sample key is fixture data, not a credential, and the module is unreachable from production composition.

Verification uses `crypto.subtle.verify`; no direct caller-defined MAC comparison is used. Parsing, reformatting, whitespace changes, LF-to-CRLF conversion, escape interpretation, and byte mutation occur only in negative tests and must fail verification. Missing or malformed `x-line-signature` fails closed.
