# Redemption Engine Contract

> Contract Version: `0.1.0-draft` · Conceptual Contract · No Runtime or Schema

## Contract Status

| Field | Value |
| --- | --- |
| Module Name / ID | Redemption Engine / `redemption-engine` |
| Purpose | 建立經 Merchant、Tenant／Shop、Member 與 Permission 驗證的 Redemption Intent／Result／Receipt |
| Business Capability | Member／Merchant QR 雙向模式、Point Request、Optional Confirmation、Reversal／Correction |
| Lifecycle / Approval | Candidate / Contract Proposed |
| Owner / Version | Unassigned / 0.1.0-draft |
| Implementation / Verification | Not Implemented / Not Verified |

## Responsibility and Boundary

- Aggregate Root：Redemption Intent。
- Owned Data：Intent、Merchant／Member Resolution Reference、Requested Amount、Confirmation、Result、Receipt、Reversal／Correction History。
- Read-only External Data：Merchant Identity／Role、Tenant Membership、Point Availability、Token Status、Shop Status。
- Dependencies：Identity、Membership、Permission、Point public commands／queries、Audit／Idempotency Candidate。
- 不負責：Camera Scanner、LINE Login、Point Ledger internal write、Payment、Coupon Rule internals、Merchant UI。

## Core Flow

```text
Token Scanned → Merchant Authenticated → Tenant／Shop Scope Verified
→ Member Resolved → Redemption Intent Created → Point Availability Checked
→ Optional Member Confirmation → Deduct／Redeem Command Issued
→ Result Recorded → Receipt Produced
```

## Public Commands

| Command | Purpose | Actor / Permission | Scope / Reference | Idempotency | Result / Failure / Audit |
| --- | --- | --- | --- | --- | --- |
| CreateRedemptionIntent | 建立扣點／核銷 Intent | Merchant Staff／`redemption.create` | Tenant+Shop+Member Token | Signed Request／Command ID | Intent Created；Unauthorized／Invalid Token；Audit |
| ConfirmRedemption | Member／Merchant 確認 | Policy Actor／`redemption.confirm` | Intent Scope | Intent+Confirmation ID | Confirmed；Expired／Conflict；Audit |
| CancelRedemptionIntent | 完成前取消 | Creator／`redemption.cancel` | Intent Scope | Intent+Cancel ID | Cancelled；Invalid State；Audit |
| CompleteRedemption | 呼叫 Point 並保存結果 | Backend／`redemption.complete` | Redemption Business Ref | Intent ID | Completed + Receipt；Point Failure -> Rejected／Pending Retry |
| ReverseRedemption | 反轉完成結果 | Finance／`redemption.reverse` | Original Intent | Original+Reason | Reversed；Point Reverse coordinated；Audit |
| CorrectRedemption | 修正非 Ledger 欄位／結果版本 | Reviewer／`redemption.correct` | Correction Case | Case ID | Corrected History；Audit |

## Queries and Events

- Queries：`GetRedemptionIntent`、`GetRedemptionResult`、`ValidateMerchantPermission`、`ResolveMemberToken`；只讀。
- Published：`RedemptionIntentCreated`、`RedemptionConfirmed`、`RedemptionCompleted`、`RedemptionRejected`、`RedemptionCancelled`、`RedemptionReversed`。
- Consumed：Point Command Result、Permission／Membership resolution；Notification Event 不決定核心交易結果。

## QR／Token and Dual-mode Safety

- 一般 Scanner 讀到 Token 不代表扣點權限；Server 驗證 Merchant Identity、Permission、Tenant、Shop。
- Token 不含修改餘額權限，可 Expire／Revoke／Rotate；不信任 URL／Client Tenant。
- Static Member QR 只解析 Member Candidate；高風險交易可要求 Dynamic Nonce 或 Member Confirmation。
- `Member Presents QR`：Merchant 掃描後建立 Intent。
- `Merchant Presents QR`：Merchant 建立交易 QR，Member 掃描確認。
- 兩種模式使用相同 Backend Transaction Safety，不把 LIFF Scanner／Camera 當安全邊界。

## Scope, Idempotency and Failure

- Tenant Scope 必要；Shop Scope 預設 required for Merchant operation。Point Account Scope 必須與 Point Program Policy 相容。
- Idempotency：Create Intent、Confirmation、Complete、Reverse 各自使用 Tenant + Operation + Intent／Business Reference，保存 Processing／Completed／Failed／Conflict。
- Audit：Merchant、Member Business Reference、Shop、Amount、Point Program、Permission Decision、Result、Reason、Correlation；Receipt 不含多餘 PII。
- Error Model：Authentication、Authorization、Scope Violation、Invalid／Expired Token、Insufficient Balance、Duplicate、Conflict、Invalid State、Point Temporary／Permanent Failure。
- Retry：只有未確定的 Point Temporary Failure 可同 Key重試；Point 成功而 Notification 失敗只重試通知，不重做 Redemption。
- Correction：完成後使用 Reverse／Correct，不能 Delete；Reverse 與 Point `ReversePointTransaction` 以原 Business Reference 關聯。

## Configuration and Operations

- Policies：Member Confirmation Threshold、Static／Dynamic Token、Receipt、Cross-shop Point availability；Insufficient 預設整筆拒絕。
- Feature Flag：`module.redemption.enabled` default off；Extension Points：Token Resolver、Confirmation Policy、Receipt Formatter（不得改交易結果）。
- Permissions：Merchant Staff 最小權限；Role revoked 後舊 Request 仍需在 Server 重新驗證。
- Security Classification：Restricted；PII 最小化，Token／Secret 不進 Log。
- Adapter Dependencies：QR／Identity Adapter；只做輸入解析與 Provider Verification。
- Observability：intent／complete／reject／reverse、insufficient、unauthorized、duplicate、point dependency、notification failure。
- Testing：兩種 QR 模式、token tamper／replay、role revoked、cross-shop／tenant、insufficient、duplicate、point timeout、notification failure、reverse；Not Started。
- Migration Concerns：Legacy Redemption 必須有 Tenant、Shop、Member、amount、result、source；缺少 Ledger link 不宣稱已對帳。
- Backward Compatibility：Intent／Receipt／Point coordination Breaking Change 需 MAJOR、Migration Plan、ADR。
- Known Limitations：Dynamic QR algorithm、member confirmation threshold、Coupon integration 未決定。

## Open Questions and Approval

| Question | Owner | Needed By | Status |
| --- | --- | --- | --- |
| 哪些金額／風險要求 Dynamic Nonce 或會員確認？ | Tony／Tenant Business Owner | Before Experimental | Open |
| Receipt retention 與 legal fields？ | Finance／Privacy Owner | Before Implementation | Open |

Architecture Owner：Tony；Approval Pending；Implementation Not Implemented；Verification Not Verified。

## Version History

| Version | Date | Author | Change | Approval |
| --- | --- | --- | --- | --- |
| 0.1.0-draft | 2026-07-15 | Codex proposal | Initial candidate contract | N/A |

相關：[Transaction Safety](39-TRANSACTION-SAFETY-STANDARD.md)、[Point Contract](34-POINT-ENGINE-CONTRACT.md)、[ADR-012](adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md)。

## Mandatory Field Declaration

- Module ID：`redemption-engine`。
- Forbidden Responsibilities：Camera Scanner、Login、Point Ledger internal write、Payment、Coupon Rule internal logic、Merchant UI。
