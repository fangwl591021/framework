# Identity Resolution

External user references are converted to a versioned HMAC digest using the existing Core identity key provider. A channel identity link must belong to the same Tenant, Application, Membership, and Core identity mapping. Database guards reject mismatched links. Suspended, revoked, missing, or cross-Tenant identities fail closed.

Identity lookup grants no Domain permission. `channel_adapter:invoke` only authorizes the integration boundary; the Workbench still performs its own intent, module, permission, traffic, confirmation, audit, and idempotency checks.

