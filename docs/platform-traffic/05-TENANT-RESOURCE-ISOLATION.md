# Tenant Resource Isolation

Each Tenant has independent budgets for concurrent requests, requests per window, expensive mutations, background intents, provider calls, and database writes. Platform budgets are evaluated separately. Exhaustion in Tenant A cannot consume Tenant B's allowance.

Platform pressure sheds non-critical work first and reserves bounded capacity for critical traffic. Tenant and platform admission are claimed in one local transition. Every admitted concurrent request receives a lease token; release is token-based and idempotent, and abandoned leases expire without counter underflow. Counter overflow fails closed. Snapshots are Tenant-scoped, immutable evidence with composite lookup and expiry indexes. These counters are protection evidence, not billing facts.