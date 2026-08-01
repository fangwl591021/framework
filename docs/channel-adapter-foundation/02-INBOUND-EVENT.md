# Inbound Event

`ChannelInboundEvent` is versioned, bounded, and channel-neutral. It admits only allowlisted event types and bounded scalar references. Raw payload, raw external UID, reply token, message text, signature, access token, and arbitrary metadata are never persisted. Persistence contains payload, signature, identity, and conversation digests plus bounded routing evidence.

The Local Web fixture supports text, follow, unfollow, postback, file, location, and unsupported events. Unsupported input produces a safe deterministic response and cannot reach a Domain service.

