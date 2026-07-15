# Attribution Engine Contract

> Contract Version: `0.1.0-draft` · Conceptual Contract · No Runtime or Schema

## Contract Status

| Field | Value |
| --- | --- |
| Module Name / ID | Attribution Engine / `attribution-engine` |
| Purpose | 保存 Share Link、Touch、Conversion Reference 與版本化 Attribution Decision |
| Business Capability | First／Last Valid Touch、No Attribution、Correction 與 Reversal |
| Lifecycle / Approval | Candidate / Contract Proposed |
| Owner / Version | Unassigned / 0.1.0-draft |
| Implementation / Verification | Not Implemented / Not Verified |

## Responsibility and Boundary

- Aggregate Roots：Share Link、Attribution Decision（以 Conversion Reference 為一致性邊界）。
- Owned Data：Share Link、Attribution Touch、Conversion Reference、Attribution Record、Decision Evidence、Correction／Reversal History、Policy Version。
- Read-only External Data：Promoter Membership／Eligibility、Tenant／Shop Status、Conversion validity。
- Dependencies：Identity／Membership／Permission Query、Conversion-producing Module、Audit／Idempotency Candidate。
- 不負責：Referral Relationship、Payment、Commission Calculation／Payment、Inventory、Point Transaction。

## Public Commands

| Command | Purpose | Actor / Permission | Tenant／Shop | Reference / Idempotency | Result / Failure / Audit |
| --- | --- | --- | --- | --- | --- |
| CreateShareLink | 建立安全追蹤連結 | Eligible Promoter／`attribution.link.create` | Tenant；Shop optional | Content／Campaign；Request ID | Link Created；Invalid Eligibility；Audit |
| RecordAttributionTouch | 保存有效接觸 | Adapter／`attribution.touch.record` | Token-resolved Tenant | Share Link + Provider Event | Touch Recorded；Tampered／Duplicate；Audit summary |
| RegisterConversion | 登記可歸因轉換 | Domain Module／`attribution.conversion.register` | Conversion Tenant | Conversion Ref；Tenant+Type+Ref | Registered；Duplicate／Scope Conflict；Audit |
| EvaluateAttribution | 產生唯一有效決策 | System／`attribution.evaluate` | 同 Tenant | Conversion+Policy Version | Attributed／Unattributed | Invalid State／Conflict；Evidence Audit |
| CorrectAttribution | 以新證據修正 | Reviewer／`attribution.correct` | 同 Tenant | Correction Case | New Record + Old Corrected | Missing Evidence；完整 Audit |
| ReverseAttribution | 反轉已成立結果 | Domain／Reviewer／`attribution.reverse` | 同 Tenant | Original Record + Reason | Reversed | Already Reversed；Audit |
| ExpireShareLink | 到期連結 | Scheduler／`attribution.link.expire` | 原 Scope | Link ID + Expiry | Expired | Invalid State；Audit |
| RevokeShareLink | 撤銷連結 | Admin／`attribution.link.revoke` | 原 Scope | Risk Case | Revoked | Permission／State；Audit |

## Queries and Events

- Queries：`GetAttributionRecord`、`ListAttributionTouches`、`GetShareLink`、`ValidateShareLink`、`ExplainAttributionDecision`；只讀。
- Published：`ShareLinkCreated`、`AttributionTouchRecorded`、`ConversionRegistered`、`ConversionAttributed`、`ConversionUnattributed`、`AttributionCorrected`、`AttributionReversed`、`ShareLinkExpired`。
- Consumed：Conversion Domain Event、Membership／Promoter status references；不消費 Referral Event 來覆寫 Referral。

## Decision Evidence and Policy

每次 Decision 保存 `policy`、`policy_version`、`window`、`eligible_touches`、`winning_touch`、`promoter_eligibility`、`decision_reason`、`decision_time`。

- Framework Default：`First Valid Touch`、`30-Day Window`。
- Tenant 可明確選 `Last Valid Touch` 或 `No Attribution`；Policy／Window 必須版本化。
- Conversion 使用發生時有效 Policy；修改 Policy 不回溯重算。
- 無有效 Evidence 為 `Unattributed`；不得猜測或做任意多點比例分配。
- Promoter 在 Conversion 時有效即可成立；日後停權不刪除歷史。Commission 由未來 Module 決定。

## Scope, Security and Reliability

- Token 不可推導 Promoter ID；Record Touch 不信任 Client Tenant／URL Parameter；Share Link 與 Conversion Tenant 必須一致。
- Shop Scope 選用且只能在 Tenant 內限縮；任何 Cross-tenant Attribution 拒絕。
- Idempotency：Share Link Request、Provider Touch Event、Conversion Reference、Conversion+Policy Evaluation、Correction Case 各自定義 Key／Stored Result。
- Audit：Decision Evidence、Policy Version、Winner、Correction／Reversal、Actor／Reason；避免保存完整 PII。
- Error Model：Validation、Tampered Token、Expired、Authorization、Scope Violation、Duplicate、Conflict、No Eligible Touch、Invalid State、Temporary Failure。
- Retry：Touch／Conversion Temporary Failure 可同 Key 重試；Evaluation 不得產生第二個 Active Record。
- Correction Method：Correct／Reverse 保留 Original；不 Delete。

## Configuration and Operations

- Configuration：Model、Window、Eligibility、Fallback；Default First Valid Touch／30 days。
- Feature Flag：`module.attribution.enabled` default off；Extension Points 僅允許版本化 Selection／Eligibility Policy。
- Security Classification：Confidential；PII 以 Anonymous／Business Reference 最小化。
- Adapter Dependencies：Link／QR／Web／Messaging Adapter，僅做格式與驗證。
- Observability：touch validity、tamper、unattributed rate、evaluation conflict、correction／reversal rate、Correlation ID。
- Testing：Policy window、first／last／none、token tamper、tenant boundary、duplicate conversion、eligibility、correction／reversal、audit；Not Started。
- Migration Concerns：Legacy Attribution 不回算；只匯入 Evidence 可重現者，否則 Unattributed／Manual Review。
- Backward Compatibility：Policy semantics、Decision Evidence、Event Contract Breaking Change 需 MAJOR／ADR。
- Known Limitations：Commission、fractional attribution、fixed Storage 未定義。

## Open Questions and Approval

| Question | Owner | Needed By | Status |
| --- | --- | --- | --- |
| 30-Day Window 的時間邊界與時區語意？ | Platform Architect／Tony | Before Experimental | Open |
| Refund 何時 Reverse 而非 Correct？ | Domain Owners | Before Integration | Open |

Architecture Owner：Tony；Approval Pending；Implementation Not Implemented；Verification Not Verified。

## Version History

| Version | Date | Author | Change | Approval |
| --- | --- | --- | --- | --- |
| 0.1.0-draft | 2026-07-15 | Codex proposal | Initial candidate contract | N/A |

相關：[Attribution Model](28-ATTRIBUTION-MODEL.md)、[ADR-011](adr/ADR-011-DEFAULT-FIRST-TOUCH-ATTRIBUTION.md)、[Transaction Safety](39-TRANSACTION-SAFETY-STANDARD.md)。

## Mandatory Field Declaration

- Module ID：`attribution-engine`。
- Policies：First Valid Touch／Last Valid Touch／No Attribution 與 versioned window。
- Permissions：Link creation、evaluation、correction、reversal 均由 Backend 驗證。
- Tenant Scope：Share Link、Touch、Conversion、Record 必須同 Tenant。
- Forbidden Responsibilities：Referral、Payment、Commission、Inventory、Point Ledger。
## Exact Contract Field Index

- Public Queries：見本 Contract 的 Queries section；所有 Query 均只讀。
- Published Domain Events：見 Domain Events 的 Published 清單。
- Consumed Domain Events：見 Domain Events 的 Consumed 清單。
- Testing Requirements：Unit、Contract、Tenant／Shop Boundary、Permission、Idempotency／Retry、Correction、Audit、Operational；目前全部 Not Started。
- Approval Status：Contract Proposed。
- Implementation Status：Not Implemented。
- Verification Status：Not Verified。
