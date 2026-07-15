# Constraint／Trigger／Atomicity Test Plan

> Design only／No tests executed。

## Coverage Matrix

| Scope | Positive | Negative | Concurrency／Replay | Fault Injection／Recovery |
| --- | --- | --- | --- | --- |
| Composite FK／Tenant isolation | same-tenant reference accepted | cross-tenant reference rejected | concurrent tenant writes isolated | orphan scan after abort |
| Active-only partial uniqueness | first active winner | duplicate active rejected | simultaneous insert unique winner | replace rollback preserves one winner |
| Role assignment scope | canonical scope accepted | nullable／cross-scope conflict rejected | duplicate assignment winner | scope reconciliation |
| Point account winner | tenant-shared／shop-scoped valid | duplicate or scope mismatch rejected | concurrent account creation | winner count scan |
| Idempotency tenant namespace | valid platform／tenant key | cross-scope reference rejected | same key replay；different fingerprint conflict | stale generation takeover rejected |
| Projection guard | matching balance/version/watermark accepted | A01～A04 abort | concurrent deduct one valid state transition | ledger or projection partial failure rolls back |
| Reverse guard | exact full reverse accepted | A05／A06 abort | repeated reverse one winner | reverse retry returns stored result |
| Single full reverse | one eligible reverse | second reverse rejected | simultaneous reverse one winner | chain reconciliation |
| Account version unique | monotonic next version | duplicate version rejected | competing effects one version winner | projection rebuild comparison |
| Idempotency effect unique | one record one ledger effect | second effect rejected | repeated command one winner | lost response returns stored result |
| Batch rollback | complete valid batch commits | one statement error aborts all | overlapping batches preserve invariants | inspect every touched table |
| Insufficient balance | sufficient deduct commits | insufficient balance creates no ledger | concurrent deductions cannot overdraw | rejected stored result replay |
| Projection drift | healthy account operates | drift blocks Point Effect | burst while drifted rejected | reconcile from ledger before healthy |
| Attendance／Redemption | valid same-tenant correlation | duplicate／cross-tenant rejected | replay one domain result | point effect correlation scan |

## Evidence Standard

每項需記錄 Test ID、Run ID、commit SHA、schema hash、fixture hash、預期結果、實際 error／result、before／after table digest、rollback outcome、reviewer 與 artifact link。不得以口頭確認或單一成功訊息取代 final-state evidence。

## Required Test Types

- Positive。
- Negative。
- Concurrency。
- Replay。
- Fault Injection。
- Recovery。

Stale Generation 必須有獨立負向案例：Lease takeover 後，舊 generation 提交 Projection、Ledger 或 terminal Stored Result 時必須被拒絕，且不得留下部分 effect。
