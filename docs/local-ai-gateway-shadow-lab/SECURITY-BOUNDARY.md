# Security Boundary

## Trusted context

Tenant ID, Application ID, actor membership, permission, provider, model, endpoint, quality tier, output limit, and budget values are server-derived. The simulation parser rejects unexpected fields and only accepts known task, scenario, budget, and cache keys.

## Browser boundary

- Same-Origin and CSRF are mandatory for simulation and reset.
- Session and CSRF tokens are stored only as digests in isolated Local D1.
- Rendering uses `textContent` and DOM nodes; raw HTML rendering is forbidden.
- Evidence stores input and idempotency digests, safe reason codes, bounded summaries, and safe timeline entries.
- Prompt text, complete response, provider credential, raw UID, SQL, and stack are not stored or rendered.
- Support codes are opaque SHA-256-derived request references.

## Authority and production isolation

Shadow cannot create a plan, invoke a tool, call a domain callback, mutate data, or alter confirmation. No external provider adapter is enabled. Formal migration `0008` and production entry `src/index.ts` are unchanged. Local code is reachable only from `src/local-demo/worker.ts`.
