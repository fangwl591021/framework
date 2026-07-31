# Platform Observability, Diagnostics and Alerting Foundation

> Platform Service Candidate · Contract Approved by Tony · Architecture Review Approved · Security Review Approved · Locally Implemented · Locally Verified · Not Deployed · Production Use Not Allowed

This Platform Service provides bounded observation evidence, deterministic failure classification, Incident aggregation, three-level diagnostics, Support Codes, dependency health, and provider-neutral alert intent. It owns no business workflow.

## Reading Order

1. [Contract](01-CONTRACT.md)
2. [Event and Incident Model](02-EVENT-INCIDENT-MODEL.md)
3. [Three-level Diagnostic Policy](03-THREE-LEVEL-DIAGNOSTICS.md)
4. [Telegram Alert Contract](04-TELEGRAM-ALERT-CONTRACT.md)
5. [Dependency Health](05-DEPENDENCY-HEALTH.md)
6. [Security and Redaction](06-SECURITY-REDACTION.md)
7. [Local Verification](07-LOCAL-VERIFICATION.md)
8. [Known Limitations](08-KNOWN-LIMITATIONS.md)
9. [Failure Isolation and Retention Policy](09-FAILURE-ISOLATION-RETENTION.md)

## Current Truth

Migration `0004_platform_observability.sql` and the service are verified only on isolated Local D1. The Contract, Architecture Review, and Security Review are approved; this does not authorize deployment or Production use. Telegram is represented by a disabled adapter and a reference-only configuration guard. No provider call, Remote D1, Binding, credential, deployment, or Production verification occurred.