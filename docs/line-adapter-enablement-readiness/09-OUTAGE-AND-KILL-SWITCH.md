# Outage and Kill Switch

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

Provider unavailability returns a safe unavailable decision without changing a completed Domain result. No fallback sends through another channel, no queue or scheduler is created, and no event is acknowledged as provider-delivered.

The kill switch is forced disabled in this lifecycle. It overrides capability, rate, credential, and approval decisions. Re-enablement requires a new reviewed implementation, isolated verification, rollback drill, and explicit execution approval.
