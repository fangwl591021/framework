# Platform Traffic Protection Foundation

> Platform Service Candidate | Contract Proposed | Locally Implemented | Locally Verified | Not Deployed | Production Use Not Allowed

Platform Traffic Protection is the provider-neutral admission and isolation layer for shared Runtime traffic. It protects business services without owning their domain rules.

## Reading order

1. [Contract](01-CONTRACT.md)
2. [Admission Pipeline](02-ADMISSION-PIPELINE.md)
3. [Webhook Deduplication](03-WEBHOOK-DEDUPLICATION.md)
4. [Rate Limiting](04-RATE-LIMITING.md)
5. [Tenant Resource Isolation](05-TENANT-RESOURCE-ISOLATION.md)
6. [Circuit Breaker](06-CIRCUIT-BREAKER.md)
7. [Load Shedding and Degradation](07-LOAD-SHEDDING-DEGRADATION.md)
8. [Security and Privacy](08-SECURITY-PRIVACY.md)
9. [Local Verification](09-LOCAL-VERIFICATION.md)
10. [Known Limitations](10-KNOWN-LIMITATIONS.md)

Migration `0005_platform_traffic_protection.sql` and the service are verified only on isolated Local D1. No Remote D1, Cloudflare Rate Limiting API, Durable Object, Queue, Cron, provider call, Binding, Secret, deployment, or Production verification occurred.