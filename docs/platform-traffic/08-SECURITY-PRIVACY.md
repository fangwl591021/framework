# Security and Privacy

- Tenant ID, Application ID, actor evidence, IP evidence, issuer context, and signatures must originate from trusted server-side context.
- Evidence stores digests and bounded reason codes, never request bodies, raw UID, Authorization data, Secret, stack trace, SQL, provider error payload, or credential.
- Tenant repositories require Tenant scope. Platform reads require `traffic:read_platform`; Tenant reads require matching Tenant plus `traffic:read_tenant`.
- Policy and lifecycle mutation permissions are registered only by reviewed migration through the Module Permission Registration Gate.
- Audit and Idempotency remain the Core authority for governed mutation evidence.
- Protection and observability failures fail safely and cannot duplicate a business mutation.