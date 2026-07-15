# Attribution Model

> **Conceptual Model / Not a Database Schema**

Attribution Engine 保存行銷互動證據，並依版本化 Policy 對每次 Conversion 產生最終 Attribution Record。它不改寫 Referral Relationship，也不直接建立 Commission。

## Share Link

概念資料包括 Sharer／Promoter Membership Reference、Tenant、Content／Product／Event Reference、Campaign、Created At、Expiration、Status、Channel、Optional Shop Scope、Secure Token Reference 與 Attribution Policy Reference。公開 Token 必須不可直接推導 Business Identity，並具簽章、隨機性、期限與 Tampering 防護。

## Attribution Touch

Touch 是一次可驗證的行銷互動，概念資料包括 Share Link、Anonymous／Resolved Visitor、Timestamp、Channel、Content Reference、Tenant、Touch Type、Validity、Optional Shop、Evidence 與 Deduplication Context。

例：點擊、掃描 QR Code、開啟 Flex、進入商品頁、進入活動頁、開始註冊、Campaign Landing 或邀請接受。Touch 可以有很多筆，不等於最終歸因。

## Conversion

Conversion 是其他 Domain Module 產生、可被歸因的業務完成事實，例如：Registration Completed、Tenant Membership Joined、Event Registered、Order Completed、Payment Completed、Check-in／Redemption Verified。Attribution 只保存其穩定 Business Reference，不擁有 Conversion 本體。

## Attribution Record

概念資料包括 Tenant、Conversion Reference、Selected Touch、Promoter Membership、Attribution Model、Window、Policy Version、Decided At、Status、Reason、Correction Reference 與 Audit Reference。

## 不變條件

- 每個 Conversion 同時只能有一個目前 Active Attribution Record。
- Correction 建立新歷史並停用舊 Record，不覆寫證據。
- Commission／Reward 是下游獨立決策，不由 Attribution Record 自動產生。
- Attribution Record 不建立或改寫 Referral Relationship。
- Promoter 必須在 Conversion 時點符合 Tenant、Status、Scope 與 Policy 資格；無效時依 Policy Reject、Fallback 或 Unattributed。
- Promoter 後續停權、資格取消或 Share Link 過期時，必須依 Conversion 發生時狀態與版本化 Policy 判定，不得直接刪除 Attribution Record。
- 無充分證據時使用 `Unattributed`，不得猜測。
- Window、First／Last Touch Model、Eligibility 與 Fallback 必須版本化。
- 不預設 Multi-layer Attribution。

## 三個概念案例

| 案例 | Referral Relationship | Conversion Attribution |
| --- | --- | --- |
| Tony 分享，使用者直接購買 | 若加入時符合條件，可建立 Tony 為直接 Referrer | 該筆購買可歸因 Tony Touch |
| Tony → A → B | B 的直接 Referrer 依建立 B Membership 的有效來源決定；預設只保存一層 | B 的 Conversion 只依其有效 Touch 判定，不建立 Tony→A→B 多層歸因 |
| 先點 Tony，後點 Mary 再購買 | 既有 Referrer 不因 Mary Touch 覆寫 | 依該 Tenant 的 First／Last Touch 與 Window Policy 選 Tony、Mary 或 Unattributed |

這些是概念比較，不宣告所有 Tenant 都採相同商業模型。相關決策見 [ADR-005](adr/ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md)。

## Sprint 5 Contract and Default Policy

- 正式候選 Contract：[Attribution Engine Contract](36-ATTRIBUTION-ENGINE-CONTRACT.md)。
- Framework Default：First Valid Touch、30-Day Window；Tenant 可選 Last Valid Touch 或 No Attribution。
- Policy／Window 版本化，不回算既有 Conversion；Commission 仍屬未來 Module。
- 相關決策：[ADR-011](adr/ADR-011-DEFAULT-FIRST-TOUCH-ATTRIBUTION.md)、[ADR-012](adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md)。
