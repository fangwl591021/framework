# Transaction Scenario Matrix

> Conceptual Acceptance Matrix · No Test Code Implemented

| Scenario | Preconditions | Actor | Tenant | Shop | Command | Permission | Idempotency Key | Expected State | Expected Event | Point Effect | Referral Effect | Attribution Effect | Audit | Failure Code | Retry Behavior | Correction Path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. 實體活動正常簽到並贈點 | Window、QR、Member valid | Member／App | A | S1 | ConfirmAttendance→GrantPoints | attendance.confirm / point.grant | Attendance Ref；Grant Ref | Attendance Confirmed；Grant Completed | AttendanceConfirmed、PointsGranted | +Rule Amount | None | None | Evidence／Rule | None | Notification only if failed | Revoke Attendance + Point Reverse if approved |
| 2. 同一 Webhook 重送三次 | Same Provider Event | Adapter | A | S1 | Same commands ×3 | Service auth | Provider Event ID | One effective result | Events once | One Grant | None | None | All attempts | Duplicate Request | Return stored result | None |
| 3. 拍下 QR 回家簽到 | Outside time/location | Member | A | S1 | VerifyPhysicalAttendance | attendance.verify | Signed Request | Rejected | AttendanceRejected | None | None | None | Time／location reason | Expired／Location Outside | No retry unless new valid attempt | Admin correction with evidence |
| 4. 線上直播動態關鍵字簽到 | Valid keyword/window | Member | A | None | VerifyOnlineAttendance | attendance.verify | Attempt+Challenge | Confirmed | AttendanceConfirmed | Optional later Grant | None | None | Challenge summary | None | Notification retry only | Correct/Revoke |
| 5. 關鍵字外洩重複使用 | One-time challenge consumed | Attacker/Member | A | None | VerifyOnlineAttendance | membership required | Challenge+Member | First valid only；others rejected | AttendanceRejected | No duplicate | None | None | Replay evidence | Duplicate／Invalid Challenge | Return permanent failure | Security review |
| 6. 店家掃會員 QR 正常扣點 | Merchant active；balance enough | Merchant Staff | A | S1 | Create/CompleteRedemption | redemption.create/complete | Redemption Intent ID | Completed | RedemptionCompleted、PointsRedeemed | -Amount | None | None | Merchant／receipt | None | Notification retry only | ReverseRedemption + Point Reverse |
| 7. 未登入店家一般相機掃 QR | No merchant session | Anonymous | A | S1 | CreateRedemptionIntent | missing | Signed Request | No intent | PermissionDenied optional | None | None | None | Minimal security audit | Authentication Error | No | None |
| 8. Shop A 扣 Shop B 限定點數 | Shop-isolated Program B | Staff A | A | A/B | RedeemPoints | wrong shop | Intent+Program | Rejected | RedemptionRejected | None | None | None | Scope violation | Scope Violation | No | Policy review only |
| 9. Tenant-wide Program 跨店扣點 | Explicit Tenant Shared policy | Staff A | A | A/B | RedeemPoints | valid tenant scope | Intent+Program | Completed | PointsRedeemed | -Amount shared account | None | None | Policy Version | None | Same key on transient | Reverse if needed |
| 10. 餘額不足 | Available < requested | Merchant | A | S1 | RedeemPoints | valid | Intent ID | Entire transaction rejected | RedemptionRejected | No ledger／negative | None | None | Availability decision | Insufficient Balance | No | New intent after balance change |
| 11. Redemption 成功通知失敗 | Core transaction succeeds | System | A | S1 | Notify | notification service | Event ID | Redemption stays Completed | DeliveryFailed | Already deducted once | None | None | Delivery attempts | Provider Error | Retry notification only | No transaction reversal |
| 12. Redemption 成功後撤銷 | Original completed | Finance Admin | A | S1 | ReverseRedemption | redemption.reverse | Original+Reason | Reversed | RedemptionReversed、PointTransactionReversed | Restored by reverse ledger | None | None | High-risk approval | None/Conflict | Same key | Correction if wrong reverse |
| 13. 同一 Conversion 註冊兩次 | Same Conversion Ref | Order Module | A | Optional | RegisterConversion ×2 | service auth | Tenant+Type+Ref | One Conversion Reference | ConversionRegistered once | None | None | One evaluation | Both attempts | Duplicate Request | Return original | None |
| 14. Referral confirmed 後點另一分享 | Active Referrer exists | Member | A | Optional | RecordTouch | attribution.touch | Provider Event | Touch recorded；Referral unchanged | AttributionTouchRecorded | None | No change | Future decision uses policy | Touch evidence | None | Same event key | Attribution correction only |
| 15. Attribution 後訂單退款 | Active Attribution | Order/Reviewer | A | Optional | ReverseAttribution | attribution.reverse | Attribution+Refund Ref | Record Reversed | AttributionReversed | None | None | No active result / history retained | Refund evidence | None | Same refund key | Correct if refund reversed |
| 16. Admin Adjust Points | Approved exceptional case | Finance Admin | A | S1 | AdjustPoints | point.adjust + approval | Case ID | Adjustment ledger created | PointsAdjusted | +/-Approved amount | None | None | Requester／Approver | Authorization/Conflict | Same case | Reverse adjustment if erroneous |
| 17. Admin 修改 Referral | Confirmed relationship；approved case | Admin+Approver | A | None | AdminCorrectReferral | referral.correct | Case+Decision | Old Replaced；new Active | ReferralReplaced | None | Changed with history | None | Full before/after | Self-approval denied | Same case | New correction case |
| 18. Share Token 被竄改 | Signature/context mismatch | Visitor | A? | Optional | RecordAttributionTouch | token validation | Signed Request | No valid Touch | Security event optional | None | None | None | Tamper summary | Validation Error | No | None |
| 19. Suspended Member 簽到 | Membership suspended | Member | A | S1 | ConfirmAttendance | inactive | Attendance Ref | Rejected | AttendanceRejected | None | None | None | Membership status | Authorization/Invalid State | No | Admin review |
| 20. Staff 權限撤銷後重送舊請求 | Role revoked after old request | Former Staff | A | S1 | CompleteRedemption | revalidated and denied | Old Request ID | No new transaction | PermissionDenied | No additional effect | None | None | Revocation/current auth | Authorization Error | No | Security review |

## Gate 3 Point Concurrency Scenarios

| ID | Scenario | Expected Winner／State | Retry／Recovery |
| --- | --- | --- | --- |
| P01 | Two concurrent deducts against one account | Conditional balance＋version guard permits only valid committed effects；balance never negative | loser receives Insufficient or Version Conflict Stored Result |
| P02 | Same key and fingerprint replay | One Idempotency Record and at most one Ledger Effect | return Processing or original Completed Result |
| P03 | Same key with different fingerprint | No Ledger Effect | permanent Conflict Stored Result |
| P04 | Commit succeeds but response is lost | Projection、Ledger、Completed Result already agree | query same key；never create a new key |
| P05 | Expired lease takeover | CAS increments processing generation and assigns new owner | new owner first reconciles Stored Result／Domain state |
| P06 | Stale owner returns | generation predicate rejects all writes | read current result；security audit if repeated |
| P07 | Projection update succeeds but Ledger insert fails | entire D1 local transaction rolls back | same key retry after temporary failure |
| P08 | Ledger insert succeeds but Stored Result completion fails | entire D1 local transaction rolls back | no normal Processing＋Ledger partial state |
| P09 | Full Reverse replay | Idempotency and Single Full Reverse Unique select one effect | return original Reverse／Already Reversed |
| P10 | Projection drift | Account guard becomes `drifted`; Point Effects stop | rebuild from Ledger, verify, Owner restores healthy |
| P11 | Hot account burst | D1 constraints remain correctness boundary | bounded retry；optional DO only after approved evidence |

## Gate 3 DB Assertion Negative Scenarios

> Proposal evidence only. Not Executed／Not Verified.

| ID | Forced Invalid Write | Expected DB Result | Expected State |
| --- | --- | --- | --- |
| A01 | Projection UPDATE affects 0 rows, then Ledger INSERT is attempted | `point_projection_guard_mismatch` abort | no Ledger；whole local batch rollback |
| A02 | Ledger `projection_version` differs from Projection | `point_projection_guard_mismatch` abort | no Ledger；whole local batch rollback |
| A03 | Ledger `id` differs from Projection `ledger_watermark` | `point_projection_guard_mismatch` abort | no Ledger；whole local batch rollback |
| A04 | Ledger `resulting_balance` differs from Projection `balance` | `point_projection_guard_mismatch` abort | no Ledger；whole local batch rollback |
| A05 | Reverse amount is not exact negative of Original | `point_reverse_guard_mismatch` abort | no Reverse；whole local batch rollback |
| A06 | Reverse references an Original whose operation is `reverse` | `point_reverse_guard_mismatch` abort | no Reverse；whole local batch rollback |

## Coverage

涵蓋 Physical／Online Attendance、QR Replay、Redemption 雙向安全、Cross-shop Point、Insufficient Balance、Notification Isolation、Duplicate Request、Point／Attribution Reversal、Referral Correction、Token Tampering、Suspended Actor 與 Permission Revocation。未來測試必須保留 Tenant Boundary negative cases 與 Stored Result evidence。
