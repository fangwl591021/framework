# Scenario Validation Matrix

> 本矩陣是未來 Contract 與驗收的概念案例，不代表測試程式或商業政策已實作。

| Scenario | Actors | Tenant | Shop | Preconditions | Command | Expected State Change | Expected Event | Permission Check | Idempotency | Audit | Failure Response | Open Policy Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. 首次直接加入 | User | A | None | Verified Identity，無 Membership | CreateMembership | Pending→Active，Source=Direct | MembershipCreated | Own enrollment allowed | 同 Join Key 不重複 | Source／Consent | Conflict if active exists | Consent requirements |
| 2. 推薦加入 | User, Tony | A | S1 | Tony Active；User 無 Membership；有效 Share Link | CreateMembershipAndAssignReferrer | Membership Active；Referral Pending→Active | MembershipCreated, ReferralConfirmed | Promoter eligibility | Join 與 Referral 各自去重 | Link／Policy Version | Reject invalid/self/cycle | Referral confirmation window |
| 3. 重複推薦分享 | User, Mary | A | S1 | User 已有 Active Referrer Tony | RecordTouch | 新增 Mary Touch；Referral 不變 | AttributionTouchRecorded | Link valid in Tenant | Touch Dedupe Key | Evidence | Accept touch; no overwrite | Attribution model/window |
| 4. Tony→A→B | Tony, A, B | A | None | A referrer=Tony；B 由 A 有效邀請加入 | AssignReferrer | B referrer=A；不建立多層關係 | ReferralConfirmed | A eligible | Membership+source key | Direct relationship | Reject cycle | Whether downstream rewards exist |
| 5. 同人加入第二 Tenant | User | B | None | Platform User 已在 Tenant A | CreateMembership | 建立 Tenant B Membership；A 不變 | MembershipCreated | Tenant B enrollment | Tenant-scoped Key | Tenant Source | No cross-tenant copy | Tenant B defaults |
| 6. 建立 Shop Membership | User, Shop Manager | A | S2 | User 有 Tenant A Membership | AssignShopMembership | Shop Membership Pending→Active | ShopMembershipActivated | Manager Scope=S2 | Assignment Key | Actor／Reason | Deny wrong Tenant/Shop | Cross-shop benefits |
| 7. Point 重送 | Staff, User | A | S1 | Active Point Account；Rule valid | GrantPoints | 只新增一筆 Grant；Balance 推導一次 | PointsGranted | Staff grant permission S1 | 相同 Boundary 回原結果 | Rule／Business Ref | Idempotency conflict | Cross-shop availability |
| 8. Point 反沖 | Tenant Admin | A | S1 | Existing Grant；未反沖 | ReversePointTransaction | 新增 Reverse；原交易保留 | PointsReversed | Reverse permission | Original+reason unique | Full financial audit | Reject duplicate/invalid | Approval threshold |
| 9. Last-touch 購買歸因 | User, Tony, Mary | A | S1 | Tony Touch 後 Mary Touch；Conversion 完成 | DecideAttribution | 建立一個 Active Record | ConversionAttributed | Promoters eligible | Conversion+Policy Version | Touch Evidence | Unattributed if insufficient | First/last model and window |
| 10. 歸因人工修正 | Auditor, Admin | A | S1 | Active Attribution 指向 Mary；新證據成立 | CorrectAttribution | 舊 Record→Corrected；新 Record→Active | AttributionCorrected | Correction permission | Case+decision version | Evidence／approvals | Deny without evidence | Downstream compensation |
| 11. Identity 衝突 | User, Identity Admin | A | None | Provider Subject 已連另一 Platform User | LinkIdentity | Mapping→Conflict；不自動 Merge | IdentityConflictDetected | High-risk review | Link Request Key | Provider Evidence | Conflict, no disclosure | Review SLA and approvers |
| 12. Membership Merge | Identity Admin | A | S1 | Duplicate confirmed；兩邊有 Membership／Point | MergePlatformUsers | Source→Merged；Target 保留；Point 用 Migration Transaction | PlatformUsersMerged | Merge permission／approval | Merge Case Key | Complete cross-domain audit | Manual review on conflict | Point/referral resolution |
| 13. 停用 Membership 後操作 | Suspended User | A | S1 | Tenant Membership Suspended | RedeemPoints | 無狀態改變 | PermissionDeniedRecorded (optional) | Active Membership required | Failed result stable for request | Security audit | Generic denied | Which reversals remain allowed |
| 14. 跨 Tenant Point 嘗試 | Staff A, User B | A/B | S1 | Staff 只屬 A；Account 屬 B | AdjustPoints | 無狀態改變 | SecurityBoundaryViolation (optional) | Tenant mismatch denied | Request not applied | High-risk denied audit | Not found/denied without leakage | Alert threshold |

## 驗收使用方式

- 每個 Module Contract 至少引用相關 Scenario。
- Accepted Policy 必須填入 Scenario 的 Open Policy Decision，並保留 Rule Version。
- 實作後應補 Contract Test、Tenant Boundary Negative Test、Idempotency Test 與 Audit Evidence。
- Scenario 通過不等於 Production Verified；正式驗證仍需明確 Environment、Commit 與 Evidence。
