# Application Assembly and Module Enablement MVP

> Platform Capability Candidate | Contract: Proposed | Locally Implemented | Locally Verified | Not Deployed | Production Use Not Allowed

Application Assembly lets a Tenant own multiple Applications and independently
controls a module's commercial entitlement and operational enablement. It is an
assembly capability, not a replacement for the governance Module Registry and
not a new business domain.

## Boundary

- Every operational record and repository query is Tenant-scoped.
- `module_catalog` is the runtime-installable catalog for one Tenant. Markdown
  registry entries remain the architecture governance source.
- A module is usable only when the Application is active, the catalog entry is
  available, entitlement is valid, enablement is enabled, dependencies are
  satisfied, and the actor has the catalog-declared Core permission.
- Trusted Application context requires a non-serializable server binding capability.
- Navigation and dashboard visibility use the same server-side facts as the
  Service gate. Client-side hiding never grants or denies authority.
- Disabling a module stops navigation, Service access, and background-work
  eligibility while retaining domain data.
- Mutations use existing Core Audit and Idempotency. Configuration is not a
  Secret store and secret-shaped keys are rejected.
- Event Engine is the first optional module. No Event business behavior was
  added or changed by this capability.

## Documents

1. [Application Assembly Contract](01-APPLICATION-ASSEMBLY-CONTRACT.md)
2. [Local Verification](02-LOCAL-VERIFICATION.md)
3. [Registry Entry](../registry/application-assembly.md)

## Current Gate

```text
Contract: Proposed
Lifecycle: Candidate
Implementation: Locally Implemented
Verification: Locally Verified on Isolated Local D1
Remote D1: Not Accessed
Production Migration: Not Executed
Binding or Secret: Not Created
Deployment: Not Performed
Production Use: Not Allowed
```
