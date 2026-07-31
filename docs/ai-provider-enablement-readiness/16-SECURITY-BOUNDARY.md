# Security Boundary

Only trusted Platform Operator context with exact Permissions can mutate Provider governance. Tenant Owners and Tenant Admins cannot manage lifecycle or Platform kill switches. Browser-supplied Tenant, Provider, model, policy, budget, or authority is ignored or rejected.

SQL is parameterized; reads are bounded and indexed; governance JSON has database size/cardinality limits. Secret values, Prompt, complete Response, upstream headers, endpoints, Stack, and SQL are excluded from storage and UI. Observation failure is isolated, while authoritative storage failure fails closed.
