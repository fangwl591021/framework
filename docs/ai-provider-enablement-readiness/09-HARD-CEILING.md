# Budget Hard Ceiling

Platform ceilings bound daily requests, estimated cost, premium requests, concurrency, and per-request input/output. Tenant budgets can only be stricter. Observe mode and fallback cannot bypass a ceiling; every hop is evaluated independently before a Provider call.

Cost is an estimate tied to a pricing version. It is not Billing, Payment, a quote, or a Provider invoice. Idempotent replay does not claim a second budget effect.
