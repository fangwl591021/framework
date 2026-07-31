# Contract

Application Assembly 將 Application、Catalog、Entitlement、Enablement、Dependency、Configuration 與可見性組合成單一後端治理邊界。

狀態：Contract Approved by Tony；Architecture Review Approved；Security Review Approved；Lifecycle Platform Service Candidate；Locally Implemented／Locally Verified；Not Deployed；Production Use Not Allowed。

讀取型 capability projection 使用無副作用的 `ModuleEligibilityEvaluator`。真正 Domain Command／Query 使用 `ModuleInvocationGuard`；固定順序為可信 Runtime Context、必要 Signature/Identity、Webhook Deduplication、Rate Limit、Tenant/Platform Resource Budget、Circuit Breaker、Load Shedding/Backpressure、Application/Module eligibility、Membership/Permission、version fence、Domain invocation。

Core Identity、Tenant、Authorization、Audit、Idempotency、Reliability、Observability 與 Traffic Protection 是 Platform capability，不是可購買或可關閉模組。Event Engine 與 Business Network Engine 保持 Domain ownership；Assembly 只治理其 Application entry boundary。