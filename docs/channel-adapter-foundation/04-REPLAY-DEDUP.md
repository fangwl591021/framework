# Replay and Deduplication

The authoritative deduplication key is `(channel_account_key, external_event_id)`. The first exact claim receives a processing lease and fencing token. The same event and payload digest replays the stored safe result; the same key with a different digest is rejected. An expired lease may be taken over with a new fence, and a stale owner cannot complete.

Inbound event creation, delivery claim, fenced completion, audit, and immutable evidence use D1 transaction boundaries. Replay does not invoke Workbench, repeat a Domain mutation, or duplicate final evidence.

