# Point Engine Contract

> Contract Version: `0.1.0-draft` · Conceptual Contract · No Runtime or Schema

## Contract Status

| Field | Value |
| --- | --- |
| Module Name / ID | Point Engine / `point-engine` |
| Purpose | 管理 Tenant Scope 內可追溯的 Point Program、Account、Ledger 與 Balance Projection |
| Business Capability | Grant、Deduct、Redeem、Expire、Reverse、Adjust，以及未來 Optional Hold／Release Extension |
| Lifecycle Status | Candidate |
| Owner | Unassigned |
| Version | 0.1.0-draft |
| Approval Status | Contract Proposed |
| Implementation Status | Not Implemented |
| Verification Status | Not Verified |

## Responsibility and Boundary

- Aggregate Roots：`Point Program`、`Point Account`。
- Owned Data：Point Program、Point Account、不可任意覆寫的 Point Transaction Ledger、Balance Projection。
- Read-only External Data：Tenant Membership Status、Shop Status、已驗證 Business Reference、Actor Permission 結果。
- Dependencies：Identity／Membership／Permission 公開 Query、Audit／Idempotency Candidate、D1 Source-of-Truth Decision。
- 不負責：活動資格、簽到定位、Order Payment、Referral、Attribution、Commission、UI Format。
- Point Rule 決定「是否與應贈／扣多少」；Point Transaction 只記錄「已發生的餘額變化」。Point Engine 不自行判斷活動是否完成。

## Public Commands

所有 Command 都需 Tenant Scope、Required Actor、Permission、Business Reference、Idempotency Key、Success／Failure Result 與 Audit。

| Command | Purpose | Actor / Permission | Shop Scope | Business Reference / Idempotency | Success | Failure / Audit |
| --- | --- | --- | --- | --- | --- | --- |
| CreatePointAccount | 建立 Program Account | System／`point.account.create` | Optional | Enrollment Ref；Tenant+Program+Member | Account Created | Duplicate／Invalid Membership；Audit |
| GrantPoints | 建立 Grant Ledger | Authorized Service／`point.grant` | Program Policy | Attendance／Order／Campaign；Tenant+Operation+Ref+Rule | Points Granted | Duplicate／Invalid State；Audit |
| DeductPoints | 扣除點數 | Authorized Operator／`point.deduct` | Account Scope | Business Ref；Command ID | Points Deducted | Insufficient Balance／Scope；Audit |
| RedeemPoints | 完成 Point Redemption | Redemption Engine／`point.redeem` | Account Scope | Redemption ID；唯一 Command ID | Points Redeemed | Insufficient／Conflict；Audit |
| ReversePointTransaction | 反轉已成立交易 | Finance Admin／`point.reverse` | 原 Scope | Original Transaction；Original+Reason | Reverse Created | Already Reversed／Not Found；高風險 Audit |
| AdjustPoints | 無法由一般交易表示的人工調整 | Finance Admin／`point.adjust` | Account Scope | Adjustment Case；Case ID | Adjustment Created | Missing Approval／Reason；高風險 Audit |
| FreezePointAccount | 凍結帳戶 | Tenant Admin／`point.account.freeze` | Account Scope | Security Case；Command ID | Account Frozen | Invalid State；Audit |
| UnfreezePointAccount | 解除凍結 | Tenant Admin／`point.account.unfreeze` | Account Scope | Review Case；Command ID | Account Active | Invalid State；Audit |
| ClosePointAccount | 關閉帳戶 | Tenant Admin／`point.account.close` | Account Scope | Closure Case；Command ID | Account Closed | Pending Hold／Invalid State；Audit |

## Public Queries

`GetPointBalance`、`GetPointAccount`、`ListPointTransactions`、`ValidatePointAvailability`、`GetPointProgram`。Query 只讀，不得建立 Transaction、更新 Projection 或延長 Idempotency Record。

## Domain Events

- Published：`PointAccountCreated`、`PointsGranted`、`PointsDeducted`、`PointsRedeemed`、`PointTransactionReversed`、`PointsAdjusted`、`PointAccountFrozen`、`PointAccountClosed`。
- Consumed：經授權 Application Command；不直接以 `AttendanceConfirmed` 自動贈點，需先由 Point Rule／Application 形成 `GrantPoints`。

## Configuration, Policies and Feature Flags

| Item | Contract |
| --- | --- |
| Cross-Shop Policy | Default `Shop Isolated`；可選 `Tenant Shared`；`Selected Shop Group` 只列未來候選 |
| Insufficient Balance | Default `Reject Entire Transaction`；不負餘額、不部分成功、不建立成功 Ledger |
| Expiration／Rounding | Tenant Point Program 的版本化 Policy；不得回溯改寫歷史 |
| Feature Flag | `module.point.enabled`，default off，Owner Unassigned，移除前需 Contract Review |
| Extension Points | Point Rule、Eligibility Policy、Expiration Strategy、Future Hold／Release |

## Scope, Safety and Correction

- Tenant Scope 必要；Shop Scope 由 Point Program 明確決定，不依 URL、畫面或目前門市推測。
- Idempotency Boundary：Tenant + Operation + Business Reference + Rule Version；保存 Processing／Completed／Failed／Conflict 結果。
- Audit：Grant、Deduct、Redeem、Reverse、Adjust、Freeze、Close 均記 Actor、Reason、Before／After、Rule Version、Correlation。
- Error Model：Validation、Authentication、Authorization、Scope Violation、Duplicate、Conflict、Insufficient Balance、Invalid State、Temporary／Permanent Failure。
- Retry：只重試 Temporary Failure；重試沿用同 Key。成功、Insufficient、Permanent Failure 不重新執行。
- Correction：完成交易使用 Reverse；特殊人工差額使用 Adjust；不得 Delete 或直接改 Balance。

## Security and Operations

- Security Classification：Confidential；Point Ledger 視為高價值交易資料。
- PII Handling：只保存 Platform／Membership Business Reference，不保存 Provider Token 或完整 PII。
- Adapter Dependencies：None；通道由 Application／Adapter 轉成 Command。
- Observability：Command outcome、duplicate rate、insufficient rate、reversal／adjust rate、projection lag、Correlation ID；Log 不含敏感資料。
- Testing Requirements：Unit、Contract、Tenant／Shop Boundary、Permission、Insufficient Balance、Concurrency、Idempotency、Retry、Reverse、Audit；全部 Not Started。
- Migration Concerns：Legacy Balance 必須先 Ledger Reconciliation；不得直接匯入最終餘額而無 Migration Transaction。
- Backward Compatibility：Breaking Command／Event／Ledger semantics 需 MAJOR、Migration Plan 與 ADR。
- Known Limitations：Hold／Release、Partial Deduction、Credit Limit、Selected Shop Group 均未批准或實作。

## Open Questions and Approval

| Question | Decision Owner | Needed By | Status |
| --- | --- | --- | --- |
| Selected Shop Group 是否需要正式 Policy？ | Architecture Owner／Tenant Business Owner | Before Experimental | Deferred |
| Point Projection 一致性與 Storage 選擇？ | Platform Architect | Schema Sprint | Open |

Architecture Owner：Tony；Review、Approval Date、Approval Reference：Pending／N/A。Contract Proposed 不代表實作或驗證。

## Version History

| Contract Version | Date | Author | Change | Approval Reference |
| --- | --- | --- | --- | --- |
| 0.1.0-draft | 2026-07-15 | Codex proposal | Initial candidate contract | N/A |

相關：[Point Account Model](26-POINT-ACCOUNT-MODEL.md)、[Transaction Safety](39-TRANSACTION-SAFETY-STANDARD.md)、[ADR-009](adr/ADR-009-REJECT-INSUFFICIENT-POINT-BALANCE.md)、[ADR-012](adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md)。

## Mandatory Field Declaration

- Module ID：`point-engine`。
- Permissions：所有寫入依 Command table 的 Required Permission，由 Backend 驗證。
- Forbidden Responsibilities：活動資格、Attendance 驗證、Payment、Referral、Attribution、Commission、UI。
