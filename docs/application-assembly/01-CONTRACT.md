# Contract

Application Assembly 將 Application、Catalog、Entitlement、Enablement、Dependency、Configuration 與可見性組合成單一後端治理邊界。

可使用模組必須同時滿足：Application active、Catalog available、有效 Entitlement、Enablement enabled、Dependency satisfied、Actor permission granted、Traffic admitted。

Core Identity、Tenant、Authorization、Audit、Idempotency、Reliability、Observability 與 Traffic Protection 是 Platform capability，不是可購買或可關閉模組。

Event Engine 與 Business Network Engine 保持 Domain ownership；Assembly 只在進入其 Application command/query 前執行 Gate。
