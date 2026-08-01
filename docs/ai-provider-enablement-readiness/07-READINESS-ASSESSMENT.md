# Readiness Assessment

The deterministic evaluator checks lifecycle, compliance, data policy, exact matrix, Secret readiness, hard ceiling, kill switch, observability, immutable usage, Shadow and Canary plans, rollback, runbooks, owner, role separation, and expiry.

Any critical blocker produces `not_ready`; critical findings cannot be hidden. External fixtures are intentionally `not_ready`. The deterministic adapter reports `ready_for_local_only`, which is not Production approval.
