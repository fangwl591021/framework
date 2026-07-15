# QA Coverage Model

每個 Module 必須建立 Coverage Matrix，欄位至少包含 Requirement／Invariant、Domain、Test Type、Lifecycle、State、Test IDs、Risk、Owner、Gap、Approval Status；不得只列測試名稱。

## Domain Coverage

Identity、Tenant、Membership、Permission、Point、Referral、Attribution、Attendance、Redemption、Audit、Idempotency、Notification、Content、OCR、Document、Commerce、Booking。

## Test Type Coverage

Positive、Negative、Boundary、Tenant Isolation、Permission、Concurrency、Replay、Recovery、Reconciliation、Performance、Security、Migration。

## Lifecycle Coverage

Create、Read、Update、Replace、Correct、Suspend、Revoke、Reverse、Archive、Anonymize、Merge、Restore if allowed。

## State Coverage

Draft、Active、Suspended、Closed、Completed、Rejected、Reversed、Expired、Drifted、Rebuilding。

任何 Required cell 沒有 Test ID 都是 Open Gap；是否阻塞 Approval 由 Risk 與 QA Gate 決定並留下理由。
