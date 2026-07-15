# Concurrency／Replay Standard

所有交易型 Module 至少評估 Concurrent Create／Update／Deduct／Reverse、Same Key＋Same／Different Fingerprint、Response Lost、Lease Takeover、Stale Owner、Duplicate Webhook、Out-of-order Event、Hot Key／Account、Retry Storm。

每個案例必須定義 Winner、Loser、Unique Guard、Conflict Code、Stored Result、Retry Rule、Final Domain State、Final Idempotency State、Audit、Evidence。

## Correctness Rules

## Required Scenario Names

案例庫必須分別保留 Concurrent Create、Concurrent Update、Concurrent Deduct、Concurrent Reverse、Same Key／Same Fingerprint、Same Key／Different Fingerprint、Response Lost、Lease Takeover、Stale Owner、Duplicate Webhook、Out-of-order Event、Hot Key／Hot Account、Retry Storm，不得合併成無法追溯的通用案例。

- Database constraint／transaction／idempotency 必須選出唯一效果。
- Response Lost 使用原 key 查 Stored Result，不建立新 key。
- Lease Takeover 必須有 generation fencing；Stale Owner 不可提交 terminal effect。
- Retry 必須 bounded，並區分 retryable、permanent、conflict。
- Durable Object 只能作量測後的序列化／load-shedding 優化，不得成為唯一 Correctness Guarantee。
