# Canonical Lifecycle and State

Status: **Consolidation Review Candidate; Real LINE Adapter Disabled; Provider and Canary Execution Not Authorized; Provider Sandbox Entry Not Authorized; Fake Only; Credentials Not Provisioned; Public Webhook Not Created; Remote D1 Not Used; Deployment Not Performed; Production Use Not Allowed; Workbench Only Authority.**

The lifecycle is exactly **Consolidation Review Candidate**. It is a review state, not an execution or release state.

The four source lifecycle states remain distinct: `readiness_candidate`, `isolated_verification_candidate`, `execution_readiness_candidate`, and `canary_enablement_readiness_candidate`. Projection accepts only the expected lifecycle for each phase and fails closed on drift.

The canonical state is immutable and deterministic: disabled adapter; unauthorized Provider, Canary, and sandbox entry; fake-only transport; no credentials or public webhook; policy/decision-only egress; no Remote D1; no deployment; no production use; Workbench-only authority.
