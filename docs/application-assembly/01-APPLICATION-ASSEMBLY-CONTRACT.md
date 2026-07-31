# Application Assembly Contract

> Contract Status: Proposed | Lifecycle: Candidate | Implementation: Locally Implemented | Production Use: Not Allowed

## Owned Capabilities

- Application lifecycle: create and suspend.
- Tenant-scoped runtime Module Catalog and dependency graph.
- Entitlement grant, expiry, and revocation history.
- Independent enablement and disablement.
- Server-side Module Access Guard.
- Dynamic Navigation Manifest and Application Dashboard projection.
- Non-secret Application Configuration history.

## Access Invariant

`CheckModuleAccess` returns allowed only when all conditions hold:

1. Application is active.
2. Module catalog entry is available.
3. Entitlement is `included` or `purchased`, or an unexpired `trial`.
4. Module is enabled.
5. Every dependency has a valid entitlement and is enabled.
6. Actor has the module's declared Core permission.

The trusted Application context is resolved from a server-composition binding
that carries a non-serializable capability marker. A client header, URL, or DTO
cannot create that context.

## Service Boundary

Domain services are invoked through a module-specific gateway. The Event
gateway never exposes the raw Event Service callback; it binds `tenant_id` from
the trusted Application context before delegating. Event Engine operation
permission checks remain authoritative. Background work must call
the same structural guard before doing module work.

## Data and Mutation Rules

- All six tables require `tenant_id`; cross-Tenant references use composite
  foreign keys.
- Catalog, entitlement, and configuration history cannot be physically deleted.
- Enabling is protected by D1 triggers for Application, availability,
  entitlement, expiry, and dependency conditions.
- Audit stores only action and resource references, never full configuration.
- Idempotency replay returns the original stored result; a reused key with a
  different fingerprint is rejected.
- Module version-range dependency comparison is outside this MVP. Dependencies
  are exact catalog relationships only.

## Out of Scope

Remote D1, Production migration, billing, provider adapters, UI, public module
administration API, CRM, Booking, AI, and Event feature expansion.
