# Security Boundary

Security invariants are signature-before-parse, 16 KiB raw input bound, parameterized SQL, explicit column lists, Tenant-aware composite foreign keys, versioned HMAC identity digests, exact deduplication, lease fencing, immutable evidence, bounded pagination, and no client-owned trusted context.

Signature, identity, configuration, and deduplication storage failures fail closed. Observation failure is isolated. There are no arbitrary URLs, outbound fetches, provider SDKs, secrets, production bindings, Remote D1 operations, or deployments.

