# Tenant Resource Isolation

Each Tenant has independent budgets for concurrent requests, requests per window, expensive mutations, background intents, provider calls, and database writes. Platform budgets are evaluated separately. Exhaustion in Tenant A cannot consume Tenant B's allowance.

Platform pressure sheds non-critical work first and preserves critical traffic. Admission increments bounded counters; completion releases concurrency. Snapshots are Tenant-scoped, immutable evidence with composite lookup and expiry indexes. These counters are protection evidence, not billing facts.