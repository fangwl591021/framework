# Telegram Alert Contract

Alerting is provider-neutral through `AlertPolicyPort`, `AlertDeliveryPort`, `AlertTemplatePort`, `AlertHistoryPort`, and `AlertRetryPort`. Local tests use a capture adapter. The Telegram adapter is disabled and always fails closed; this Sprint makes no network call.

Trusted configuration contains references only: bot credential Secret reference, Chat ID environment reference, enabled state, minimum severity, and environment allowlist. Values must be injected by a trusted environment configuration in a future deployment. Development does not send Telegram by default; invalid or incomplete Production configuration fails closed.

Policy behavior:

- critical creates an immediate alert intent;
- error requires its occurrence threshold;
- warning is summarized, not immediately delivered;
- info does not alert;
- cooldown suppresses repeat delivery, except severity escalation;
- a deterministic delivery key makes replay idempotent;
- failure records a safe reason and bounded retry intent;
- alert failure never changes the original business result.

Payloads contain only severity, environment, Incident ID, safe title, affected Tenant count, occurrence and time bounds, release, dependency, operator action, and Support Code. They exclude user content, provider identifiers, request bodies, credentials, Stack, SQL, and storage paths.