# Scenario Validation Matrix

> 本矩陣是未來 Module Contract、Policy 與驗收的概念案例，不代表測試程式、Schema 或商業政策已實作。

| Scenario | Actors | Tenant | Shop | Preconditions | Command | Expected State Change | Expected Event | Permission Check | Idempotency | Audit | Failure Response | Open Policy Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. 同一 LINE 使用者加入 Tenant A 與 Tenant B | User | A、B | None | 同一 Provider Identity 已解析為同一 Platform User | CreateMembership(A)、CreateMembership(B) | 建立兩筆獨立 Tenant Membership；Point／Referral／Role 分開 | MembershipCreated ×2 | 各 Tenant Enrollment | Tenant + Join Key | 各自 Source／Consent | Active Membership 已存在則回原結果 | 各 Tenant Consent／Tier 預設 |
| 2. 同人在 Tenant A 的 Shop 1 與 Shop 2 消費 | User、Staff | A | S1、S2 | Active Tenant Membership；兩 Shop 有效 | RecordPurchase／ApplyPoints | 建立各自交易；Point 依 Tenant Point Policy 共用或 Shop-scoped | PurchaseRecorded；必要時 PointTransactionCreated | Staff 與 Account Shop Scope | Business Reference + Program + Scope | Policy Version／Shop | 未定義 Policy 時拒絕跨 Shop，不猜測 | Tenant Point Policy、Shop Point Policy |
| 3. Tony 邀請 Mary 加入 Tenant A | Tony、Mary | A | Optional | Tony 與 Invite Link 有效；Mary 尚無 A Membership | CreateMembershipAndAssignReferrer | Mary Membership Active；Tenant A Referral Active | MembershipCreated、ReferralConfirmed | Tony Promoter Eligibility | Join Key／Referral Source Key | Link、Rule Version | Self、Cycle、Invalid 則拒絕 | Referral Confirmation Window |
| 4. Mary 先點 Tony 後點另一人連結再購買 | Mary、Tony、Promoter B | A | Optional | 兩個有效 Touch；Mary 可能已有 Referrer | DecideAttribution | 保留多筆 Touch；建立一筆目前有效 Attribution；Referral 不變 | AttributionTouchRecorded ×2、ConversionAttributed | Promoter 在 Conversion 時有效 | Touch Dedupe；Conversion + Policy Version | Winning／Losing Evidence | 證據不足則 Unattributed | First／Last Touch、Window |
| 5. Webhook 重送同一筆打卡 | Member、Webhook Adapter | A | S1 | Attendance Event 有穩定 Business Reference | VerifyAttendanceAndGrantPoints | 只建立一筆有效 Attendance 與一筆 Point Grant | AttendanceVerified、PointsGranted 各一次 | Member／Event／Shop Scope | Attendance Key 與 Grant Key | 每次接收與 Stored Result | 後續重送回已處理結果 | Retry Retention／Late Event |
| 6. 未登入店家用一般相機掃會員 QR Code | Anonymous Scanner、Member | A | S1 | QR 僅含公開或安全 Token | RedeemOrDeductPoints | 不建立扣點或核銷 Transaction | PermissionDenied／Security Event（依 Policy） | 必須有登入 Staff 與 Redeem Permission | 未授權 Request 不可形成交易 | 掃描與拒絕最小化 Audit | Generic Unauthorized，不洩漏餘額／會員資料 | 公開 Token 可顯示內容 |
| 7. OCR 名片候選會員由本人以 LINE Login 認領 | Scanner、Claimant、Reviewer | A | Optional | OCR Candidate 有 Source；LINE Identity Verified | ClaimCandidateMembership | 進入 Identity Resolution／Claim Review；核准後 Link 或 Merge Membership，不直接覆寫 | ClaimSubmitted、IdentityLinked／MembershipMerged | Claimant Proof；高風險 Review Permission | Claim Case Key | Scanner、Original Source、Before／After | Conflict Queue，不自動 Merge | Claim Evidence／Approval SLA |
| 8. Google Login 與 LINE Login 建立兩個 Platform User | User、Identity Admin | A | None | 兩個 Verified Mapping；存在 Duplicate Evidence | ReviewAndMergePlatformUsers | 先標示 Duplicate Candidate；核准後 Source→Merged、Mappings 指向 Target | DuplicateCandidateDetected、PlatformUsersMerged | High-risk Merge Permission | Merge Case Key | Evidence、Source／Target、Tenant Impact | 不足證據則維持候選 | Merge Approvers／Split Plan |
| 9. 店家管理員修改 URL 存取其他 Tenant 會員 | Tenant A Admin | B | Any | Actor 只有 Tenant A Role | GetTenantMembership(B) | 無資料狀態變更 | SecurityBoundaryViolation／PermissionDenied | Backend Tenant Scope 必須拒絕 | 相同 Request 不影響資料 | Security Audit，不記錄敏感資料 | Not Found／Denied，不洩漏存在性 | Alert Threshold |
| 10. 業績歸因後推廣者資格被取消 | Promoter、Finance、Admin | A | Optional | Conversion 時可能有效；Attribution 已建立 | ReviewAttributionEligibility | 不刪除 Record；依 Policy 維持、Reverse 或 Correct；Commission 另處理 | AttributionReviewed／Reversed／Corrected | Correction／Finance Permission | Case + Decision Version | Conversion-time Status、付款狀態 | 缺 Policy 進 Manual Review | 未支付／已支付 Commission Reversal |
| 11. Point Grant 重送 | Staff、Member | A | S1 | Active Point Account；Rule valid | GrantPoints | 只新增一筆 Grant；Balance 推導一次 | PointsGranted | Staff Grant Permission | Tenant + Business Ref + Rule Version | Actor／Rule／Amount | Idempotency Conflict 回原結果或明確錯誤 | Key Retention |
| 12. Point Transaction 反沖 | Finance Admin | A | S1 | Existing Grant／Redeem；未反沖 | ReversePointTransaction | 新增 Reverse；原 Transaction 保留 | PointsReversed | Reverse Permission | Original Transaction + Reason | 完整帳務 Audit | Duplicate／Invalid Reference 拒絕 | Approval Threshold |
| 13. Tony→A→B 分享鏈 | Tony、A、B | A | None | A 的 Referrer=Tony；B 由 A 有效邀請 | AssignReferrer(B,A) | B Direct Referrer=A；不建立 Tony→B 多層收益 | ReferralConfirmed | A Eligibility | Membership + Source Key | Direct Relationship | Cycle／Self 拒絕 | 是否有獨立合法 Reward Extension |
| 14. Suspended Membership 嘗試扣點 | Suspended Member、Staff | A | S1 | Tenant Membership Suspended | RedeemPoints | 無 Point Transaction | PermissionDenied／TransactionRejected | Active Membership Required | Failed Result 對同 Request 穩定 | Security／Business Rejection | Generic denied | Suspended 時允許哪些 Correction |
| 15. 跨 Tenant Point 調整 | Staff A、Member B | A、B | S1 | Staff 只屬 A；Account 屬 B | AdjustPoints(B) | 無狀態改變 | SecurityBoundaryViolation | Tenant mismatch denied | Request 不套用 | 高風險拒絕 Audit | 不洩漏 Account 存在性 | Alert／Incident Threshold |

## Covered Risks

- 同一 External Identity 跨 Tenant 造成會員、點數、Referral 或 Role 污染。
- 未定義 Cross-shop Policy 時由程式猜測 Point Scope。
- Click、Membership Referral 與 Conversion Attribution 被誤當同一關係。
- Webhook／掃碼／Command 重送造成重複 Attendance、Point 或 Attribution。
- QR Token 或 URL Tampering 繞過 Backend Permission。
- OCR Claim、Provider Login 與 Legacy Import 直接覆寫既有 Identity／Membership。
- Duplicate Merge、Point Reverse、Attribution Correction 刪除歷史。
- 推廣者資格或 Commission 狀態變更時直接刪除 Attribution Record。

## 驗收使用方式

- 每個 Module Contract 至少引用適用 Scenario，並補上實際 Policy Version 與 Expected Error。
- Open Policy Decision 只能由 Tenant Business Owner／Tony 在適用範圍內決定，不得由實作者猜測。
- 未來實作需補 Contract Test、Tenant Boundary Negative Test、Idempotency Test 與 Audit Evidence。
- Scenario 通過不等於 Production Verified；正式驗證仍需明確 Environment、Commit、Tenant Scope 與 Evidence。

## Sprint 5 Transaction Scenario Extension

交易安全的 20 個 Physical／Online Attendance、Redemption、Point、Referral、Attribution、Permission 與 Retry 案例見 [Transaction Scenario Matrix](43-TRANSACTION-SCENARIO-MATRIX.md)。Sprint 4 Scenario 仍保留作 Domain Boundary 驗證，不被新矩陣取代。
