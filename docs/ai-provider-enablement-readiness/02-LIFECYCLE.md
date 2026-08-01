# Provider Enablement Lifecycle

The lifecycle is ordered: `draft → compliance_review → security_review → approved_for_shadow`. Suspension and revocation are fail-closed exits. `revoked` and `retired` are terminal; a new Provider version is required afterward.

This release refuses `shadow_active`, `canary_approved`, `canary_active`, `production_approved`, and `production_active`. The database stores append-only versions and rejects skips or stale versions.
