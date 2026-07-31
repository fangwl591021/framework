# Admission Pipeline

The fixed order is:

1. Establish trusted environment, Tenant, Application, actor, route, priority, and operation context.
2. Validate identity and webhook signature evidence when applicable.
3. Claim webhook deduplication receipt.
4. Evaluate rate policy.
5. Evaluate Tenant and platform resource budgets.
6. Evaluate dependency circuit.
7. Apply load shedding and backpressure.
8. Enforce Module Gate.
9. Enforce Permission.
10. Invoke the Domain Service.

Client headers cannot establish trusted Tenant, Application, actor, IP, provider, or signature evidence. Protection dependency failure fails closed with a bounded retry response. Critical security and operational routes remain reachable during emergency degradation.