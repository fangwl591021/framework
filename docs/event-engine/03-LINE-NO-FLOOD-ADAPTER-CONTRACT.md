# LINE No-Flood Event Registration Adapter Contract

> Adapter design only · No LINE／LIFF API call · No deployment

The no-flood pattern keeps transport behavior outside Event Domain Core:

1. Event Engine creates one versioned `EventSharePayload`.
2. A future LINE Share Target Adapter converts that payload to a share message.
3. The user explicitly chooses recipients through Share Target Picker.
4. A future LIFF Adapter opens an event registration surface and resolves LINE identity through Identity Core.
5. The Adapter calls `RegisterForEvent` with a Platform User reference, Tenant context and Idempotency key.
6. Event Engine creates one adapter-neutral Notification Intent for the participant.
7. A future Notification Adapter may deliver a private confirmation; delivery is not part of the Domain transaction.

## Forbidden Behavior

- Event Engine never calls the LINE Messaging API.
- Event Engine never stores LINE access tokens, raw user IDs or raw provider subjects.
- Registration steps do not echo messages into a group or room.
- Capacity, waitlist, payment and check-in state changes do not broadcast automatically.
- Share clicks do not create registrations.
- Adapter retries must reuse the same Idempotency key and must not produce another Registration effect.

## Adapter Inputs

The Adapter receives only:

- `EventSharePayload.version`
- opaque Tenant, Event, Session and Share references
- title suitable for transport rendering

The Adapter returns no provider payload to Event tables. Provider delivery identifiers, if required later, belong to an Adapter-owned delivery record under a separately approved Notification contract.
