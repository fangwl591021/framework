# Load Shedding and Degradation

Modes are `normal`, `protect_background`, `protect_optional`, `protect_writes`, and `emergency`. Recovery requires deterministic hysteresis to prevent rapid mode flapping.

Deferred work receives an `accepted` or `processing` receipt with support code and bounded retry guidance. It is not reported as completed. The local intent store is idempotent and bounded; no Queue, Cron, scheduler, or Remote Worker is created. Health, readiness, status, and security routes remain available; readiness reports emergency degradation explicitly.