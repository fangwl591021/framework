# Engine Design

本文件以 Domain Module 與 Platform Core 候選能力的角度描述 Engine。所有項目目前只完成文件模板，不代表已有程式實作、Schema、公開 API 或 `Core Approved`。

## Engine 清單

| Engine | Responsibility | 初步分層 |
| --- | --- | --- |
| Identity Center | 管理 Platform User 與 Identity Mapping | Platform Core Candidate |
| Tenant Manager | 管理 Tenant 生命週期、狀態與邊界 | Platform Core Candidate |
| CRM Engine | 管理 Tenant 內 CRM Profile、互動與標籤 | CRM Module Candidate |
| Point Engine | 管理 Tenant 內可追溯 Point Account 與異動 | Point Module Candidate |
| Referral Engine | 管理 Tenant 內 Referral Relationship 與事件 | Referral Module Candidate |
| Attribution Engine | 判定來源、活動、通道與轉換歸因 | Attribution Module Candidate |
| Content Engine | 管理內容、版本、語系與發布狀態 | Content Module Candidate |
| Event Engine | 管理活動、報名、參與與簽到生命週期 | Event Module Candidate |
| Document Engine | 管理文件、版本、狀態與處理工作 | Document Module Candidate |
| OCR Engine | 將影像或文件轉為帶信心資訊的結構化結果 | OCR Module Candidate |
| Notification Engine | 編排通知意圖、樣板、通道與發送結果 | Notification Module Candidate |
| Media Engine | 管理媒體儲存、轉換、中繼資料與存取政策 | Media Module Candidate |
| AI Engine | 管理模型能力、Prompt、工具、政策、成本與觀測 | AI Module Candidate |
| Permission Engine | 依主體、資源、操作與範圍執行授權 | Platform Core Candidate |
| Setting Engine | 管理 Configuration 繼承、覆寫與驗證 | Platform Core Candidate |
| API Gateway | 管理驗證、路由、版本、限流與 API 觀測規範 | Platform Core 規範 Candidate |

## Engine Boundary Template

每個 Engine 在進入 Experimental 前，必須用下列模板建立自己的契約文件：

```markdown
## [Engine Name]

- Responsibility：唯一且可驗證的責任。
- Input：接受的 Command、Query、Domain Event 或公開資料格式。
- Output：回應、錯誤、Domain Event 與副作用。
- Owned Data：只有本 Engine 可直接寫入的資料概念。
- Public Interface：其他 Domain Module／Application 可依賴的版本化契約。
- Events：發布與訂閱的 Domain Event、版本及 Idempotency 規則。
- Configuration：可調參數、預設值、作用層級與驗證方式。
- Extension Points：允許的 Hook、Policy、Strategy 或 Plugin Interface。
- Forbidden Responsibilities：明確列出不得承擔的通道、客戶或其他領域責任。
```

## 初步邊界範例

以下只示範文件深度，不是實作規格。

### Point Engine

- **Responsibility**：維護單一 Tenant 內可追溯的 Point 異動與餘額結果。
- **Input**：經授權且具 Idempotency Key 的增加、扣除、到期或調整 Command。
- **Output**：異動結果、餘額 Query 結果與 Point Domain Event。
- **Owned Data**：Point Account 與 Point Transaction 概念。
- **Public Interface**：版本化 Point Command／Query Contract。
- **Events**：Point Granted、Point Spent、Point Expired 等候選 Domain Event。
- **Configuration**：有效期限與啟用規則；實際贈點數值由 Tenant Configuration 或 Policy 決定。
- **Extension Points**：Point Calculation Policy、Eligibility Strategy。
- **Forbidden Responsibilities**：不得判定 Referral 歸屬、解析 LINE 事件或直接讀取 CRM 資料表。

### Identity Center

- **Responsibility**：維護 Platform User 與外部 Identity Mapping。
- **Input**：經 Adapter 驗證的 Provider Identity 與帳號連結 Command。
- **Output**：Platform User 識別、Identity Mapping 結果與身份 Domain Event。
- **Owned Data**：Platform User 與 Identity Mapping 概念。
- **Public Interface**：Resolve Identity、Link Identity、Unlink Identity 契約。
- **Events**：Identity Linked、Identity Unlinked 等候選 Domain Event。
- **Configuration**：允許的登入 Provider 與連結政策。
- **Extension Points**：Identity Verification Policy。
- **Forbidden Responsibilities**：不得保存 Tenant Point、Referral、CRM 或以登入成功授予 Tenant Permission。

## 共通契約

- 每個 Engine 必須公開版本化 Interface，不公開 private 資料結構。
- 每個 Engine 必須定義 Platform User、Tenant Scope 與 Permission 要求。
- 跨 Engine 寫入不得直接操作對方 Owned Data。
- 非同步協作需定義 Domain Event 版本、Idempotency、重試與失敗處理。
- Adapter、Extension 與 Application 不得繞過公開 Interface。
- Engine Candidate 需依 [Module Lifecycle](11-MODULE-LIFECYCLE.md) 與 [Module Promotion Standard](14-MODULE-PROMOTION-STANDARD.md) 取得成熟度證據。

## Sprint 4 Core Domain Engine Supplements

### Identity Engine

- Responsibility：解析 Platform User 與受驗證 Identity Mapping。
- Owned Data：Platform User、Identity Mapping、Identity Conflict。
- Commands：Link Identity、Unlink Identity、Suspend Identity、Merge Platform Users。
- Queries：Resolve Platform User、Get Identity Status。
- Published Events：IdentityLinked、IdentityConflictDetected、PlatformUsersMerged。
- Forbidden Responsibilities：不得管理 Tenant Membership、Point、Referral 或 Role。

### Membership Engine

- Responsibility：管理 Tenant Membership 與 Shop Membership 生命週期。
- Owned Data：Tenant Membership、Shop Membership、Membership Source。
- Commands：Create Membership、Assign Shop Membership、Suspend Membership。
- Queries：Get Tenant Membership、List Shop Memberships。
- Published Events：MembershipCreated、ShopMembershipActivated、MembershipSuspended。
- Forbidden Responsibilities：不得驗證 Provider Token、直接修改 Point Ledger 或授權自己。

### Point Engine

- Responsibility：管理 Tenant-scoped Point Account 與 Transaction Ledger。
- Owned Data：Point Program、Point Account、Point Transaction。
- Commands：Grant、Redeem、Expire、Reverse、Adjust Points。
- Queries：Get Point Balance、List Point Transactions。
- Published Events：PointsGranted、PointsRedeemed、PointsReversed。
- Forbidden Responsibilities：不得直接修改 Balance、判定 Referrer 或保存 Provider Identity。

### Referral Engine

- Responsibility：管理 Tenant 內長期 Single-layer Direct Referral。
- Owned Data：Referral Relationship、Referral Policy Decision。
- Commands：Assign Referrer、Correct Referral、Revoke Referral。
- Queries：Get Active Referrer、Get Referral History。
- Published Events：ReferralConfirmed、ReferralCorrected、ReferralRejected。
- Forbidden Responsibilities：不得決定 Conversion Attribution、Commission 或 Point Amount。

### Attribution Engine

- Responsibility：保存 Touch 並依版本化 Policy 判定 Conversion Attribution。
- Owned Data：Share Link、Attribution Touch、Attribution Record。
- Commands：Record Touch、Decide Attribution、Correct Attribution。
- Queries：Get Conversion Attribution、List Touches。
- Published Events：AttributionTouchRecorded、ConversionAttributed、AttributionCorrected。
- Forbidden Responsibilities：不得覆寫 Referral、擁有 Conversion 或直接發放 Reward。

### Permission Engine

- Responsibility：依 Actor、Action、Resource 與 Scope 判斷授權。
- Owned Data：Role、Permission、Role Assignment、Scope Policy。
- Commands：Assign Role、Revoke Role、Expire Assignment。
- Queries：Authorize Action、List Effective Permissions。
- Published Events：RoleAssigned、RoleRevoked、PermissionDenied。
- Forbidden Responsibilities：不得驗證 Login Provider、修改 Membership Business State 或承載客戶流程。

## Sprint 5 Transactional Engine Contracts

| Engine | Contract | Responsibility Summary |
| --- | --- | --- |
| Point Engine | [Contract](34-POINT-ENGINE-CONTRACT.md) | Point Program、Account、Ledger、Projection 與安全交易 |
| Referral Engine | [Contract](35-REFERRAL-ENGINE-CONTRACT.md) | Invitation、Candidate、First Valid Direct Referral 與歷史修正 |
| Attribution Engine | [Contract](36-ATTRIBUTION-ENGINE-CONTRACT.md) | Share Link、Touch、Conversion Decision、Correction／Reversal |
| Attendance Engine | [Contract](37-ATTENDANCE-ENGINE-CONTRACT.md) | Physical／Online Attendance 驗證與防重 |
| Redemption Engine | [Contract](38-REDEMPTION-ENGINE-CONTRACT.md) | Merchant-authenticated Intent、Point 協作、Receipt 與 Reverse |

五個 Contract 皆為 Candidate、Contract Proposed、Not Implemented、Not Verified；不得標示 Stable 或 Production Ready。
