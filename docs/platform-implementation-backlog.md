# Platform Implementation Backlog

## LINE Adapter

Current phase: **Isolated Verification Candidate**, real adapter **Disabled**, provider transport **Fake Only**, credentials **Not Provisioned**, production **NO-GO**.

The [isolated verification package](line-adapter-isolated-verification/README.md) now covers the published empty-events signature vector, byte-preserving verification, bounded webhook normalization, event-ID replay behavior, reply-token lease semantics, fake transport failure classes, and production isolation. This is local deterministic evidence only and does not prove provider connectivity or acceptance.

Future work requires a separate PR and cannot be inferred from readiness completion:

1. Architecture acceptance of provider-specific transport composition.
2. Security and Privacy approval of credential provider, data handling, and retention.
3. Governed credential references and rotation drill without values in source.
4. Isolated provider-account webhook authenticity and provider-delivered redelivery verification; deterministic local verification alone is complete but insufficient.
5. Provider response, rate, retry, outage, and unknown-result drills.
6. Operations ownership, cost limits, alerting, rollback, and evidence review.
7. Explicit execution approval before any production binding or route.

No provider execution item is approved or implemented by the current [readiness package](line-adapter-enablement-readiness/README.md) or isolated verification package. Real transport, credentials, webhook exposure, Remote D1, and Production remain NO-GO.
