# Data Handling Policy

Sensitivity order is `public < internal < confidential < restricted < prohibited`; task and input classification use the stricter result. `prohibited` always fails closed. `restricted` additionally requires explicit zero retention, regional processing, and deletion capability.

Tenant policy may narrow but never loosen Platform denial. Redaction does not create permission. Prompt and complete Response content remain excluded from Usage, Observation, Audit, and governance evidence.
