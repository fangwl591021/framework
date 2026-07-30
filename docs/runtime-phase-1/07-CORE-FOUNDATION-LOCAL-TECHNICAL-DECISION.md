# Runtime Phase 1 Core Foundation Local Technical Decision

> Local Runtime Decision for `agent/runtime-phase-1-core-foundation` only.

## Status and Authority

| Dimension | Decision |
| --- | --- |
| Decision Type | Local Runtime Decision |
| Scope | Runtime Phase 1 Core Foundation Bootstrap |
| Accepted ADR Impact | None; ADR-001 through ADR-017 remain unchanged |
| SQL／Migration／D1 | Not authorized |
| Secret／Binding | Not authorized |
| Production／Deployment | Not authorized |
| Domain Module Implementation | Not authorized |

This record selects implementation details needed to verify the Foundation locally. It does not resolve Security, D1, Migration, Provider, business capability or production decisions.

## Runtime Language and Module Format

- TypeScript with strict type checking.
- ECMAScript Modules.
- Web-standard APIs compatible with the Cloudflare Workers runtime.
- One modular-monolith Worker entry with a thin composition boundary.
- No Node.js compatibility flag, Node.js runtime API or Wrangler configuration is required by this slice.

## Router Strategy

The Foundation uses a small owned exact-path router supporting Method, Path, Handler, `404` and `405`. It does not introduce a web framework, middleware framework, SaaS framework, OpenAPI generator or business route.

## UUIDv7 Strategy

The Foundation uses an owned RFC 9562 UUIDv7 utility built on Web Crypto `crypto.getRandomValues()`.

- The first 48 bits encode Unix epoch milliseconds.
- Version bits are fixed to `7`.
- Variant bits are fixed to the RFC 4122／RFC 9562 `10` variant.
- A generator instance maintains only timestamp and random-sequence state needed for monotonic ordering; it never stores request, Tenant, User or External Identity state.
- Same-millisecond generation increments the 74-bit random field.
- No database, sequential Business ID, External Identity Subject or `crypto.randomUUID()` substitute is used.

The implementation remains a Local Technical Decision. Its conformance evidence is local test evidence, not production approval.

## Test Runner and Build

- Vitest runs local unit and contract tests.
- TypeScript performs strict type checking.
- esbuild performs a local ESM bundle check without Wrangler, Binding or deployment.
- Cloudflare Workers types provide current platform API declarations.

All development dependencies are exact-version pinned in `package.json` and the lockfile.

## Error Envelope

Every response uses one safe envelope:

- Success: `ok`, `data`, `meta.correlationId`, `meta.timestamp`.
- Error: `ok`, `error.code`, safe `error.message`, `meta.correlationId`, `meta.timestamp`.

Defined Foundation codes are `INVALID_REQUEST`, `ROUTE_NOT_FOUND`, `METHOD_NOT_ALLOWED`, `INTERNAL_ERROR` and `SERVICE_NOT_READY`. Unknown exceptions are converted to `INTERNAL_ERROR`; stack traces, raw exception messages, internal paths, Binding names and Secrets never enter the client response.

## Correlation ID Policy

- Server-generated UUIDv7 is the default.
- `x-correlation-id` is accepted only when it is 1–64 characters and matches the allowed ASCII set: letters, digits, `.`, `_`, `:`, `-`.
- Control characters, whitespace and invalid or oversized values are ignored and replaced with a server-generated UUIDv7.
- A correlation ID is observability metadata only. It never proves Tenant, User, Credential, Role or authorization.
- Client Tenant headers never populate trusted Tenant Context.

## Health and Readiness Routes

- `GET /health` proves only that the Runtime can execute the request pipeline.
- `GET /ready` proves only that local Foundation composition created the router, request-context factory, UUIDv7 utility and four Module boundary skeletons.
- Neither endpoint checks or claims D1, Provider, Secret, Binding, Domain Module or production readiness.

## Dependency Composition

- `src/runtime/composition-root.ts` explicitly constructs the Foundation.
- No dependency-injection container is used.
- Each request receives a new immutable Request Context.
- No global mutable request context exists.
- Audit and Idempotency use disabled adapters that fail closed for persistence-requiring operations.

## Explicit Exclusions

This decision does not authorize Tenant or Platform User CRUD, Identity Linking, Membership, Role Assignment, Login, Provider adapters, administration UI, Booking, Appointment, Calendar, CRM, Point, Referral, Product, Coupon, AI Agent, SQL, Migration, D1, KV, R2, Queue, Secret, Binding, Wrangler or deployment.
