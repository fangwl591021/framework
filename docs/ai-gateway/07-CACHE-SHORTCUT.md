# Cache／Shortcut

Cache Key 包含 Tenant、Application、Task／Version、Input Digest、Schema Digest、Locale、Policy Version 與 Route Compatibility。Payload 上限 4 KiB，具 TTL 與 lifecycle guard。

Cache Hit 仍經 Budget Claim 並產生 Usage Evidence。Shortcut 僅允許 Task Registry 內 deterministic 行為；本版沒有 Knowledge Cache。
