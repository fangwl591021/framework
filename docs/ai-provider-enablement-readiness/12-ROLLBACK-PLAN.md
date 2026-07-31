# Provider Rollback Plan

Rollback targets are deterministic-only, cache-only, Provider disabled, or task disabled. Steps and verification are bounded and versioned, with no shell credential or Secret.

Order is route disable, in-flight handling, deterministic restoration, then verification of no new Provider requests, complete Usage evidence, reclaimed leases, and reconciled circuit/incident state. Only Local deterministic drills are implemented.
