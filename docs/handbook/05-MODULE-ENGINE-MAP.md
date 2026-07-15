# Module and Engine Map

> 導覽摘要 · 未列 Contract 的能力仍需正式 Contract；所有項目目前均未實作、未驗證

## Core and Domain Map

| Engine | Purpose | Owned Data | Key Commands／Queries／Events | Forbidden Responsibilities | Current Status | Official Link |
| --- | --- | --- | --- | --- | --- | --- |
| Identity Engine／Center | 解析與連結平台身份 | Platform User、Identity Mapping | Link／Unlink／Resolve；Identity resolution events 待 Contract | Tenant Point、CRM、Role | Architecture Boundary；Not Implemented | [Identity Center](../06-IDENTITY-CENTER.md) |
| Tenant Manager | 管理 Tenant／Brand／Shop 階層 | Tenant、Brand、Shop lifecycle | Create／Suspend／Resolve scope 待 Contract | Platform User、Domain Transaction | Architecture Boundary；Not Implemented | [Organization Hierarchy](../22-ORGANIZATION-HIERARCHY.md) |
| Membership Engine | 管理 Tenant／Shop 會員關係 | Tenant Membership、Shop Membership | Create／Suspend／Resolve；Membership events 待 Contract | Provider identity、Point Ledger | Domain Boundary；Not Implemented | [Membership Model](../25-MEMBERSHIP-MODEL.md) |
| Permission Engine | 評估 Role、Permission 與 Scope | Role、Permission、Role Assignment | Grant／Revoke／Evaluate 待 Contract | 建立身份、信任前端角色名稱 | Architecture Boundary；Not Implemented | [Role／Permission](../29-ROLE-PERMISSION-SCOPE.md) |
| CRM Engine | Tenant 內客戶關係能力 | Contract 尚未批准 | Commands／Queries／Events TBD | 平台身份、跨 Tenant Profile | Candidate Source；Not Implemented | [Asset Map](../02-FEATURE-ASSET-MAP.md) |
| Point Engine | 管理 Program、Account、正式 Ledger、Projection | Point Program／Account／Transaction／Projection | Grant、Deduct、Redeem、Reverse、Adjust；Balance／History；PointsGranted 等 | Attendance qualification、Payment、Referral | Candidate；Contract Proposed；Not Implemented；Not Verified | [Point Contract](../34-POINT-ENGINE-CONTRACT.md) |
| Referral Engine | 維護單層直接介紹關係 | Invitation、Candidate、Relationship、History | Invite、Confirm、Correct；Active Referrer／History；ReferralConfirmed 等 | Attribution、Commission、多層收益 | Candidate；Contract Proposed；Not Implemented；Not Verified | [Referral Contract](../35-REFERRAL-ENGINE-CONTRACT.md) |
| Attribution Engine | 保存 Touch、Conversion Reference 與 Decision | Share Link、Touch、Attribution Record | RecordTouch、Evaluate、Correct；Explain Decision；ConversionAttributed 等 | Referral、Payment、Commission、Point Ledger | Candidate；Contract Proposed；Not Implemented；Not Verified | [Attribution Contract](../36-ATTRIBUTION-ENGINE-CONTRACT.md) |
| Attendance Engine | 驗證 Physical／Online Attendance | Attempt、Evidence Summary、Attendance Record | Verify、Confirm、Correct；Status／Duplicate；AttendanceConfirmed 等 | 直接 Grant Point、Scanner／GPS Provider | Candidate；Contract Proposed；Not Implemented；Not Verified | [Attendance Contract](../37-ATTENDANCE-ENGINE-CONTRACT.md) |
| Redemption Engine | 管理 Merchant-verified Intent／Result／Receipt | Redemption Intent、Result、Receipt History | Create／Complete／Reverse；Intent／Result；RedemptionCompleted 等 | 直接寫 Point Ledger、Login、Scanner | Candidate；Contract Proposed；Not Implemented；Not Verified | [Redemption Contract](../38-REDEMPTION-ENGINE-CONTRACT.md) |
| Event Engine | 活動與 Session 領域能力 | Contract 尚未批准 | Commands／Queries／Events TBD | Attendance Verification、Point Ledger | Candidate；Not Implemented | [Engine Design](../07-ENGINE-DESIGN.md) |
| Content Engine | 通道無關內容與集合 | Contract 尚未批准 | Commands／Queries／Events TBD | LINE Flex transport details | Candidate；Not Implemented | [Engine Design](../07-ENGINE-DESIGN.md) |
| Document Engine | 文件生命週期與解析協作 | Contract 尚未批准 | Commands／Queries／Events TBD | OCR Provider internals | Candidate；Not Implemented | [Asset Map](../02-FEATURE-ASSET-MAP.md) |
| OCR Engine | OCR workflow／provider abstraction | Contract 尚未批准 | Commands／Queries／Events TBD | Business Card／Travel business truth | Candidate；Not Implemented | [Asset Map](../02-FEATURE-ASSET-MAP.md) |
| Notification Engine | 多通道通知協調 | Delivery intent／result 待 Contract | Send／Retry／Delivery events TBD | 回滾核心交易、擁有 Domain Result | Candidate；Not Implemented | [Integration Matrix](../42-ENGINE-INTEGRATION-MATRIX.md) |
| Commerce Engine | 商品、訂單與交易領域候選 | Contract 尚未批准 | Commands／Queries／Events TBD | 平台身份、Point Ledger internals | Candidate Source；Not Implemented | [Asset Map](../02-FEATURE-ASSET-MAP.md) |
| Business Card Engine | 電子名片領域候選 | Contract 尚未批准 | Commands／Queries／Events TBD | Identity Mapping 或 OCR Provider | Candidate Source；Not Implemented | [Asset Map](../02-FEATURE-ASSET-MAP.md) |
| Audit Log Candidate | 最小重要決策／變更證據 | Candidate Audit Record | Record／Search Contract TBD | Domain Transaction、Debug Log、完整 Payload | Platform Core Candidate；Not Implemented；Not Verified | [Core Candidates](../21-CORE-CROSSCUTTING-CANDIDATES.md) |
| Feature Flag Candidate | 控制曝光、試用與緊急停用 | Flag governance metadata TBD | Evaluate／Change Contract TBD | 永久 Configuration、隱藏安全問題 | Platform Core Candidate；Not Implemented；Not Verified | [Core Candidates](../21-CORE-CROSSCUTTING-CANDIDATES.md) |
| Idempotency Candidate | 保護 Command 重送與 Stored Result | Candidate Idempotency Record | Claim／Complete／Replay Contract TBD | 一般 Cache、Domain Truth | Platform Core Candidate；Not Implemented；Not Verified | [Idempotency Standard](../40-IDEMPOTENCY-STANDARD.md) |
| Module Registry Candidate | 模組 Lifecycle／版本／Owner 索引 | Governance metadata only | Registry maintenance；no runtime events | 載入／部署 Module、Tenant Data | Platform Core Candidate；Not Implemented；Not Verified | [Registry Standard](../20-MODULE-REGISTRY-STANDARD.md) |

## 使用規則

- 其他 Module 只能依賴 Public Command、Query 或版本化 Domain Event，不得讀寫 private table／function。
- Owned Data 的副本不轉移 Ownership。
- `Candidate`、`Contract Proposed`、`Not Implemented`、`Not Verified` 必須同時保留，直到各自有正式證據。
- 五個 Candidate Registry Entry：[Point](../registry/point-engine.md)、[Referral](../registry/referral-engine.md)、[Attribution](../registry/attribution-engine.md)、[Attendance](../registry/attendance-engine.md)、[Redemption](../registry/redemption-engine.md)。
