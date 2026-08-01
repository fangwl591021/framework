# Known Limitations

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

- No real webhook handler, SDK, provider endpoint, signature credential, delivery credential, or outbound request exists.
- The signature vector is synthetic and local-only; it proves byte/algorithm handling, not provider connectivity.
- No provider payload parser, response serializer, delivery receipt, retry worker, queue, scheduler, or outage integration exists.
- No remote or production D1 data is accessed and no schema is added.
- No privacy, cost, operations, credential, shadow, canary, production, or deployment approval exists.
- Capability mappings are plans and cannot send messages.
- The kill switch remains forced disabled and the readiness decision remains NO-GO.
