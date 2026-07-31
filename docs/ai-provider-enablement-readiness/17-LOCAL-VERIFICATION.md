# Local Verification

Verification uses isolated Local D1 migrations 0001 through 0009, forced mid-migration rollback, Vitest Workers pool, deterministic fixtures, and real Local Wrangler routes `/local/ai-lab/readiness/` and `/local/ai-lab/drills/`.

The UI is Local-only, Same-Origin and CSRF protected, renders dynamic values through `textContent`, exposes no Secret input, and displays `NOT PRODUCTION APPROVAL`. No Remote D1 or external Provider is contacted.
