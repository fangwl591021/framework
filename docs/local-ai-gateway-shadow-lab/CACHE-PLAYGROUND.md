# Cache Playground

Cache behavior uses the formal AI Gateway cache tables and service. The Lab stores no raw input in its own evidence.

- First identical request: miss and local deterministic provider completion.
- Second identical request: Tenant/Application-scoped hit.
- Expired entry: status changes through the local fixture, then formal lookup misses.
- Tenant A and Tenant B: independent cache scope for the same input.
- Invalid output: rejected before cache write.
- Retired task: rejected before cache consumption.

The UI shows only a digest prefix, scope label, status, expiry, stale boundary, and payload size. Raw input and complete cache-key material are not returned.
