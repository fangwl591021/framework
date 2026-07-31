# Security and Redaction

## Input Controls

- metadata: at most 20 keys, 512 serialized bytes in the application, 160 characters per text value;
- safe messages: 1–500 characters and rejected when they contain technical secrets, SQL verbs, Stack evidence, or internal Windows paths;
- actor references: versioned digest shape or explicitly service-scoped reference;
- Support Codes: a short digest-derived code with a 30-day mapping expiry;
- list limits: clamped to 1–100 with opaque UUID cursor;
- all D1 statements are parameterized and list queries select explicit columns.

## Authorization

Tenant-scoped methods require an explicit Tenant ID plus permission. Platform-wide visibility requires `diagnostics:read_platform`. Incident mutations require `incident:manage`; alert history requires `alert:read`. Permissions are versioned Migration vocabulary and are never registered by Runtime.

## Storage and Evidence

Audit stores action, resource reference, decision, safe reason, and correlation reference rather than payload copies. Idempotency stores a bounded result and rejects a reused key with a different fingerprint. Immutable and lifecycle triggers prevent destructive history changes. No raw external UID, request body, credential value, provider call, or Production evidence is stored.