# Referral Engine Contract

> Contract Version: `0.1.0-draft` · Conceptual Contract · No Runtime or Schema

## Contract Status

| Field | Value |
| --- | --- |
| Module Name / ID | Referral Engine / `referral-engine` |
| Purpose | 管理 Tenant 內 Invitation、Candidate、Confirmation、Direct Referrer History 與 Correction |
| Business Capability | 建立安全邀請並維護 Single-Layer Referral Relationship |
| Lifecycle / Approval | Candidate / Contract Proposed |
| Owner / Version | Unassigned / 0.1.0-draft |
| Implementation / Verification | Not Implemented / Not Verified |

## Responsibility and Boundary

- Aggregate Roots：Referral Invitation、Referral Relationship。
- Owned Data：Invitation、Candidate、Direct Relationship、History、Correction Decision。
- Read-only External Data：Platform User Resolution、Tenant Membership Status、Promoter Eligibility、Permission Result。
- Dependencies：Identity、Membership、Permission、Audit／Idempotency Candidate。
- 不負責：Touch Tracking、Conversion Attribution、Commission、Multi-level Tree／Revenue、CRM Ownership。

## Public Commands

| Command | Purpose | Actor / Permission | Tenant／Shop | Business Reference / Idempotency | Result / Failure / Audit |
| --- | --- | --- | --- | --- | --- |
| CreateReferralInvitation | 建立安全邀請 | Active Member／`referral.invite` | Tenant；Shop optional | Campaign／Purpose；Invitation Request | Invitation Created；Invalid Eligibility；Audit |
| RegisterReferralCandidate | 保存候選 | Membership App／`referral.candidate` | 同 Tenant | Invitation+Candidate Membership | Candidate Registered；Duplicate／Cross-tenant；Audit |
| ConfirmReferral | 確認 First Valid Referrer | System／`referral.confirm` | 同 Tenant | Membership Join；Tenant+Member | Active Relationship；Self／Cycle／Existing Active；Audit |
| RejectReferral | 拒絕候選 | System／`referral.reject` | 同 Tenant | Candidate ID；Decision ID | Rejected；Reason required；Audit |
| ReplaceReferral | 依核准 Policy 替換 | Authorized Reviewer／`referral.replace` | 同 Tenant | Correction Case；Case ID | Old Replaced + New Active；Conflict；高風險 Audit |
| RevokeReferral | 撤銷關係 | Authorized Reviewer／`referral.revoke` | 同 Tenant | Risk Case；Case ID | Revoked；Invalid State；Audit |
| AdminCorrectReferral | 人工正式修正 | Tenant Admin Requester + Independent Approver／`referral.correct` | 同 Tenant | Review Case；Case+Decision | Corrected History；Self-approval denied；完整 Audit |

## Queries and Events

- Queries：`GetActiveReferrer`、`GetReferralHistory`、`ValidateReferralCandidate`、`GetReferralInvitation`；全部只讀。
- Published：`ReferralInvitationCreated`、`ReferralCandidateRegistered`、`ReferralConfirmed`、`ReferralRejected`、`ReferralReplaced`、`ReferralRevoked`。
- Consumed：`MembershipCreated` 或 Identity／Membership Resolution 結果；不得由一般 Attribution Touch 觸發 Relationship 覆寫。

## Policies and Token Safety

- Default：`First Valid Referrer`、`Single Layer`、`No Self`、`No Cycle`、`No Normal Overwrite`。
- Change Window：Confirmed 後 `No Self-Service Change`；Tenant 可在 Confirmation 前設定短暫 Pending Window。
- Referral Token 不暴露 Member ID，包含 Tenant／Purpose Context，可 Expire、Revoke；Server 必須驗證，不信任 Client Parameters。
- Feature Flag：`module.referral.enabled`，default off；Extension Points 僅限 Eligibility、Pending Window、Admin Approval Policy，不含 Multi-level Revenue。

## Scope, Reliability and Correction

- Tenant Scope 必要；Shop 只作 Invitation／Eligibility optional scope，不得取代 Tenant Relationship。
- Idempotency：Tenant + Membership + Confirmation Purpose；Invitation、Candidate、Confirm、Correction 各有穩定 Key 與 Stored Result。
- Audit：所有 Confirm、Reject、Replace、Revoke、Correction 保存 Source、Old／New、Reason、Actor、Approver、Policy Version。
- Error Model：Validation、Authorization、Scope Violation、Duplicate、Self Referral、Cycle、Existing Active、Expired、Invalid State。
- Retry：Transient Resolution 可重試；同 Key 不重建 Relationship；Permanent Policy Failure 不重試。
- Correction：Replacement 保留舊 Active 為 Replaced；Revoke／Correct 不 Delete。

## Security, Operations and Lifecycle

- Permissions：Member 可建立 Invitation；System 可依 Policy Confirm；Admin Correction 需要 Requester／Approver Separation。
- Security Classification：Confidential；PII 只用 Business Reference，Token／Log 不含 Provider UID。
- Adapter Dependencies：None；QR／LINE／Web 只透過 Adapter 傳入安全 Token。
- Observability：Invitation usage、candidate conflict、self／cycle rejection、replacement rate、Correlation ID。
- Testing：Policy、Token tampering、Tenant boundary、self／cycle、duplicate、approval separation、retry、history；全部 Not Started。
- Migration Concerns：Legacy Referrer 需來源、時間、Tenant 與 Conflict Review；不得覆寫 Target Active。
- Backward Compatibility：Relationship semantics 或 Event Breaking Change 需 MAJOR 與 ADR。
- Forbidden Responsibilities：Attribution、Commission、Point、CRM direct write、Multi-level Logic。
- Known Limitations：固定 SLA、Multi-level Extension 與 Reward 尚未定義。

## Open Questions and Approval

| Question | Owner | Needed By | Status |
| --- | --- | --- | --- |
| Pending Window 最大範圍與 Tenant 設定治理？ | Tony／Tenant Business Owner | Before Experimental | Open |
| Admin Correction 是否一律雙人批准？ | Architecture Owner | Before Experimental | Open |

Architecture Owner：Tony；Approval／Implementation／Verification 分別為 Pending、Not Implemented、Not Verified。

## Version History

| Version | Date | Author | Change | Approval |
| --- | --- | --- | --- | --- |
| 0.1.0-draft | 2026-07-15 | Codex proposal | Initial candidate contract | N/A |

相關：[Referral Model](27-REFERRAL-RELATIONSHIP-MODEL.md)、[ADR-010](adr/ADR-010-FIRST-VALID-REFERRER.md)、[Correction Standard](41-CORRECTION-REVERSAL-STANDARD.md)。

## Mandatory Field Declaration

- Module ID：`referral-engine`。
- Configuration：Pending Window、Invitation Expiration、Eligibility 與 Admin Approval 都需 Tenant-scoped versioned configuration。
- Shop Scope：Optional invitation／eligibility context；Active Referral Relationship 仍以 Tenant 為 Boundary。
## Exact Contract Field Index

- Public Queries：見本 Contract 的 Queries section；所有 Query 均只讀。
- Published Domain Events：見 Domain Events 的 Published 清單。
- Consumed Domain Events：見 Domain Events 的 Consumed 清單。
- Testing Requirements：Unit、Contract、Tenant／Shop Boundary、Permission、Idempotency／Retry、Correction、Audit、Operational；目前全部 Not Started。
- Approval Status：Contract Proposed。
- Implementation Status：Not Implemented。
- Verification Status：Not Verified。
