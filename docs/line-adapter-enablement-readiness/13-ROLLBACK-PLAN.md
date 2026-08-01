# Rollback Plan

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Current rollback is deterministic: remove the readiness-only composition from a future review branch and retain `disabled_line_adapter`. There is no migration, provider resource, credential, binding, endpoint, remote record, or deployment to reverse in this package.

Before future enablement, rollback evidence must prove kill-switch precedence, adapter disablement, traffic drain, unknown-result reconciliation, credential revocation, provider outage handling, and restoration of deterministic Workbench/channel behavior.
