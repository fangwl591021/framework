# Channel Adapter Contract

The module owns channel catalog metadata, channel accounts, authenticity adapters, inbound normalization, delivery coordination, rendering, and safe delivery evidence. It does not own Tenant authority, Core identity, permission evaluation, Workbench intent authority, business mutation, provider credentials, or transport deployment.

Processing order is fixed: raw byte bound, account lookup, signature verification, parsing, digest-only persistence, deduplication claim, trusted identity resolution, traffic admission, Workbench bridge, safe rendering, fenced completion, and evidence. Any required guard failure fails closed. Observability remains a sidecar and cannot change the business result.

