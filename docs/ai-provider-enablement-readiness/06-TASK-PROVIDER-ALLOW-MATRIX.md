# Task and Provider Allow Matrix

Each row exactly binds Provider/version, model/version, task/version, environment, sensitivity, quality, input/output/cost/latency limits, and data-policy version. Wildcards and all-task grants are forbidden.

The maximum mode in this release is `shadow_only`; it records governance eligibility only. Because the Secret reference is still planned and external adapters remain disabled, it cannot execute a Provider.
