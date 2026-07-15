# Referral and Attribution Logical Model

> Logical Design Proposal · Separate Ownership and Lifecycle

## Separation Rule

Referral Relationship 是 Tenant Membership 的長期直接推薦關係；Attribution Touch 是互動證據；Attribution Record 是單一 Conversion 的版本化決策。三者不得合併成可覆寫的 referrer 欄位。

## Referral Logical Records

### Referral Relationship

- Owner：Referral Engine。
- 核心語意：Tenant、Referred Membership、Direct Referrer Membership、Source Reference、Policy Version、Status、Effective Period、Original／Replacement Reference、Audit Reference。
- 唯一性候選：每個 Tenant Membership 同時最多一個 Active Direct Referrer。
- 建立前驗證同 Tenant、No Self、No Cycle、Referrer Eligibility 與 Membership Lifecycle。
- Confirmed 後一般使用者不可覆寫；Correction／Migration 建立新版本並保留舊關係。

## Attribution Logical Records

### Share Link

- Owner：Attribution Engine。
- 保存 Tenant、Promoter Membership Reference、Campaign／Content／Event Reference、Optional Shop Scope、Policy Reference、Validity 與不可推導身份的 Public Token Reference。
- Public Token 的生成、簽章與儲存方式屬安全 Physical Design。

### Attribution Touch

- 保存 Share Link、Tenant、Anonymous／Resolved Visitor Reference、Channel、Touch Type、Occurred Time、Validity、Evidence Summary、Deduplication Context。
- Touch 可多筆存在，不代表 Referral 或最終 Attribution。

### Attribution Record

- 保存 Tenant、Conversion Business Reference、Selected Touch／Promoter、Model、Window、Policy Version、Decision Time、Status、Reason、Original／Correction Reference、Audit Reference。
- 唯一性候選：每個 Conversion＋目前有效 Decision Slot 同時最多一個 Active Record。
- 無充分證據時建立或回傳 Unattributed 結果，不猜測 Promoter。

## Cross-record Constraints

| Constraint | Enforcement Owner |
| --- | --- |
| Referrer 與 Referred Membership 必須同 Tenant | Referral Engine |
| Share Link、Touch、Conversion、Attribution Record Tenant 必須一致 | Attribution Engine |
| Attribution 不建立或改寫 Referral | Module Contract Boundary |
| Referral／Attribution 不直接支付 Point 或 Commission | 下游 Module Command |
| Correction 保留 Original、Evidence 與 Policy Version | 各 Owner Module |
| Promoter Eligibility 以 Conversion 時點與版本化 Policy 判定 | Attribution Engine |

## Access Patterns

- 依 Tenant Membership 查詢目前 Referral 與完整歷史。
- 依安全 Token Reference 解析 Share Link，但不回傳 Promoter PII。
- 依 Tenant＋Conversion Reference 取得 Attribution Stored Result。
- 依 Campaign／Time／Channel 查詢 Touch Evidence；Analytics 讀取不得改寫 Decision。
- 依 Original Reference 查詢 Correction Chain。

## Retention and Privacy

- Touch Evidence 依風險與隱私 Policy 設定 Retention；不必要的 IP、User Agent 或原始 Provider Payload 不進核心 Record。
- Referral、Conversion Decision 與 Correction History 依業務與稽核需求保留；身份 Erasure 後使用不可逆 Reference 或 Anonymization 維持歷史一致性。

相關文件：[Referral Engine Contract](35-REFERRAL-ENGINE-CONTRACT.md)、[Attribution Engine Contract](36-ATTRIBUTION-ENGINE-CONTRACT.md)、[ADR-005](adr/ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md)。
