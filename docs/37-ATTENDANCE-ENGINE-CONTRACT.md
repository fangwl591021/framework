# Attendance Engine Contract

> Contract Version: `0.1.0-draft` · Conceptual Contract · No Runtime or Schema

## Contract Status

| Field | Value |
| --- | --- |
| Module Name / ID | Attendance Engine / `attendance-engine` |
| Purpose | 驗證 Physical／Online Event Attendance 並防止重複確認 |
| Business Capability | Attempt、Time／Session／Optional Location／Challenge Validation、Confirmation、Correction |
| Lifecycle / Approval | Candidate / Contract Proposed |
| Owner / Version | Unassigned / 0.1.0-draft |
| Implementation / Verification | Not Implemented / Not Verified |

## Responsibility and Boundary

- Aggregate Root：Attendance Record（Tenant + Event + Session + Membership + Purpose）。
- Owned Data：Attempt、Verification Evidence、Attendance State、Correction／Revocation History。
- Read-only External Data：Event／Session window、Tenant Membership、Location／Challenge Policy、Permission Result。
- Dependencies：Identity／Membership／Permission、Event public contract、Audit／Idempotency Candidate。
- 不負責：Point Balance／Grant、Reward Payment、Event Content、LINE Scanner、GPS Provider、Notification Format。

## Supported Validation

| Mode | Required | Optional / Forbidden Assumption |
| --- | --- | --- |
| Physical Event | Tenant、Event、Session、Start／End、Member、Duplicate、QR／Token Validity | Grace Period、Location、Allowed Radius；GPS 不得是唯一身份證明 |
| Online Meeting／Live Stream | Event、Session、Time Window、Member、Duplicate | Dynamic Keyword、One-time Challenge、Meeting Context；不得要求 GPS |

## Public Commands

| Command | Purpose | Actor / Permission | Scope / Reference | Idempotency | Result / Failure / Audit |
| --- | --- | --- | --- | --- | --- |
| StartAttendanceAttempt | 建立驗證 Intent | Member／`attendance.attempt` | Tenant+Event+Session+Member+Purpose | Signed Request／Command ID | Attempted；Expired／Scope；minimal Audit |
| VerifyPhysicalAttendance | 驗證時間、Token、optional location | Member／`attendance.verify` | Event Session Ref | Attempt ID | Verified／Rejected；Evidence Audit |
| VerifyOnlineAttendance | 驗證時間、Keyword／Challenge | Member／`attendance.verify` | Event Session Ref | Attempt+Challenge | Verified／Rejected；不記錄敏感 Keyword 明文 |
| ConfirmAttendance | 建立唯一有效 Attendance | System／`attendance.confirm` | Tenant+Event+Session+Member+Purpose | Composite Business Key | Confirmed；Duplicate 回原結果；Audit |
| RejectAttendance | 正式拒絕 Attempt | System／`attendance.reject` | Attempt ID | Decision ID | Rejected；Reason／Audit |
| CorrectAttendance | 歷史修正 | Authorized Reviewer／`attendance.correct` | Correction Case | Case ID | Corrected Version；Audit |
| RevokeAttendance | 撤銷已確認 Attendance | Event Admin／`attendance.revoke` | Original Attendance | Original+Reason | Revoked；Audit；下游 Compensation 另處理 |

## Queries and Events

- Queries：`GetAttendanceStatus`、`ValidateAttendanceWindow`、`CheckDuplicateAttendance`、`ListMemberAttendance`；不得確認 Attendance。
- Published：`AttendanceAttempted`、`AttendanceVerified`、`AttendanceRejected`、`AttendanceConfirmed`、`AttendanceCorrected`、`AttendanceRevoked`。
- Consumed：Event／Session configuration、Membership status；不直接消費 Point Rule 來修改 Account。

## Point Integration

Attendance 成功只發布 `AttendanceConfirmed`。Point Rule／Application 判斷資格後才送 `GrantPoints`，並以 Attendance Business Reference 作 Idempotency。Attendance Engine 不得直接修改 Point Account；Point 或 Notification 失敗不回滾已確認 Attendance，需各自 Retry／Compensation。

## Scope, Policies and Reliability

- Tenant Scope 必要；Shop／Location optional 且不得跨 Tenant。Membership Suspended 時預設拒絕。
- Idempotency Boundary：Tenant + Event + Session + Tenant Membership + Attendance Purpose；Policy 範圍內最多一筆有效 Attendance。
- Configuration：time window、grace period、physical／online mode、location radius、challenge policy；版本化且保存於 Evidence Reference。
- Feature Flag：`module.attendance.enabled` default off；Extension Points：Location Validator、Online Challenge Strategy。
- Audit：Confirm、Reject、Correct、Revoke；保存 Actor、Evidence summary、Reason、Policy Version，避免精確位置長期保存。
- Error Model：Expired、Invalid Token、Invalid Challenge、Duplicate、Authorization、Scope Violation、Location Outside、Invalid State、Provider／Temporary Failure。
- Retry：Provider／network Temporary Failure 可同 Attempt 重試；Confirmed／Rejected Permanent 結果不重做。
- Correction：Correct／Revoke 保留 Original；不可 Delete。

## Security, Operations and Lifecycle

- Permissions：Member submit；Event Admin correct/revoke；Backend validates all scope。Scanner／GPS／Keyword 不是安全邊界。
- Security Classification：Confidential；PII 最小化，Location／Meeting Context 依 Retention Policy。
- Adapter Dependencies：QR、Location、Meeting／Messaging Adapter；不承載 Attendance Policy。
- Observability：attempt／confirm／duplicate／reject rates、provider failures、point handoff outcome、Correlation ID。
- Testing：Physical／online window、QR replay、keyword leak、duplicate concurrency、suspended member、tenant/shop boundary、correction、audit；Not Started。
- Migration Concerns：Legacy Check-in 需 Tenant、Event、Session、Member、time、source；缺少者進 Conflict／Unverified。
- Backward Compatibility：Attendance identity／uniqueness／Event semantics 改變需 MAJOR 與 ADR。
- Known Limitations：GPS／Meeting Provider、fixed radius、challenge algorithm 未選定。

## Open Questions and Approval

| Question | Owner | Needed By | Status |
| --- | --- | --- | --- |
| Dynamic Keyword／Challenge 的重放期限？ | Event／Security Owners | Before Experimental | Open |
| Location Evidence retention？ | Privacy Owner | Before Implementation | Open |

Architecture Owner：Tony；Approval Pending；Implementation Not Implemented；Verification Not Verified。

## Version History

| Version | Date | Author | Change | Approval |
| --- | --- | --- | --- | --- |
| 0.1.0-draft | 2026-07-15 | Codex proposal | Initial candidate contract | N/A |

相關：[Transaction Safety](39-TRANSACTION-SAFETY-STANDARD.md)、[Integration Matrix](42-ENGINE-INTEGRATION-MATRIX.md)、[Correction Standard](41-CORRECTION-REVERSAL-STANDARD.md)。

## Mandatory Field Declaration

- Module ID：`attendance-engine`。
- Shop Scope：Optional，依 Event／Session／Location Policy；永遠保留 Tenant Scope。
- Forbidden Responsibilities：Point Balance／Grant、Reward Payment、Event Content、Scanner／GPS Provider、Notification Format。
