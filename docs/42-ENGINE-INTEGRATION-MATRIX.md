# Engine Integration Matrix

> Conceptual Contract Matrix · No Event Bus, Queue Consumer or API Implemented

| Source Engine | Target Engine | Trigger | Command／Query／Event | Data Shared | Data Not Shared | Failure Handling | Retry | Idempotency | Audit | Ownership |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Attendance | Point | Attendance confirmed and rule eligible | `GrantPoints` Command | Tenant、Membership Ref、Attendance Ref、Rule Version | Location evidence、private Attendance state | Point failure 不回滾 Attendance；record handoff | Same Grant Key | Attendance Ref + Rule | Handoff／result | Attendance owns attendance；Point owns ledger |
| Redemption | Point | Confirmed Intent | Availability Query + `RedeemPoints` | Intent Ref、Account Ref、Amount、Scope | Token secret、Merchant private profile | Persist pending/rejected; reconcile result | Same Intent Key | Redemption Ref | Merchant／Point result | Redemption owns intent；Point owns ledger |
| Attribution | Commission Future | Attribution finalized | Future Domain Event | Tenant、Conversion、Promoter Ref、Decision Version | Touch internals、PII | Future module decides payment; no rollback | Consumer policy TBD | Event ID + Conversion | Attribution decision | Attribution owns record；Commission owns payment |
| Referral | Membership | Referral confirmed | `ReferralConfirmed` Event / Membership Query | Tenant、Member／Referrer Ref、Source | Provider Identity、CRM data | Membership remains valid if downstream update fails | Event retry | Event ID | Relationship decision | Referral owns relationship |
| Share Link / Application | Attribution | Link used | `RecordAttributionTouch` | Secure Link Ref、event context | Raw promoter ID in URL | Invalid/tampered -> reject | Provider event retry | Event ID／Link | Validity summary | Attribution owns link/touch |
| Membership | Referral | Candidate identity resolved | `RegisterReferralCandidate` | Tenant、Membership Ref、Invitation Ref | Membership private profile | Candidate pending/rejected | Same Candidate Key | Membership+Invitation | Resolution | Membership owns member；Referral owns candidate |
| Identity | Membership | Platform User resolved | Resolve／Create Membership flow | Platform User Ref、verification status | Provider token、other Tenant data | Conflict -> manual review | Same linking key | Identity request | Identity decision | Identity owns mapping；Membership owns relation |
| Point | Notification | Point transaction completed | Domain Event | Tenant、Member Ref、safe result summary | Ledger internals、balance beyond need | Notification failure 不回滾 Point | Notification-only retry | Event ID | Delivery result | Point owns transaction |
| Redemption | Notification | Redemption result recorded | Domain Event | Intent Ref、safe receipt summary | Token／permission internals | 不回滾 Redemption | Notification-only retry | Event ID | Delivery result | Redemption owns result |
| Attendance | Notification | Attendance confirmed/rejected | Domain Event | Attendance Ref、safe status | Location／challenge secret | 不回滾 Attendance | Notification-only retry | Event ID | Delivery result | Attendance owns status |

## Integration Rules

- Source 不直接寫 Target Owned Data；只使用公開 Command、Query 或版本化 Event。
- Data Shared 遵循最小必要與 Tenant Scope；取得副本不轉移 Ownership。
- Notification 失敗永遠不得回滾已成功的 Point、Redemption 或 Attendance 核心交易。
- 每個非同步 Event 定義 Event ID、Version、Tenant、Correlation、Retry、Dead-letter／Manual Review Candidate 與 Idempotent Consumer。
- 本文件不批准 Commission Module、Queue、Event Bus 或 Runtime Registry。
