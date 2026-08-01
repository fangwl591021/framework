# Privacy and Retention

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

No new persistence is added. Raw webhook body, raw UID, group/room ID, message content, postback data, reply token, signature, credential, provider header, and provider response are forbidden from evidence and logs. A future adapter may retain only existing Channel Adapter digests and bounded status evidence under approved retention policy.

Privacy approval, deletion/anonymization behavior, data residency, provider terms, and retention duration remain independent production blockers.
