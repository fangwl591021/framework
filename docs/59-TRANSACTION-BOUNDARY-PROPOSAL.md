# Transaction Boundary Proposal

> Proposal Only · No Runtime · No SQL Executed

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

D1 在單一 database 內可提供 local SQL transaction semantics；本 Proposal 不假設跨 database、Module、Queue、Provider 或 Notification 的分散式 transaction。實作 API 與 atomic claim 方法仍未決定。

## Active-only Lifecycle Standard

Active-only Domain Record 統一使用 status-based Partial Unique Index；不使用 `active_marker`，也不讓 nullable business scope 欄位直接參與一般 UNIQUE。Idempotency 的 scope-separated partial indexes是不同用途，不代表 lifecycle state。

| Record | Effective Status | Unique Winner Key |
| --- | --- | --- |
| Identity Mapping | `active` | provider＋context＋subject hash |
| Tenant Membership | `active` | tenant＋platform user |
| Shop Membership | `active` | tenant＋membership＋shop |
| Role Assignment | `active` | subject＋role＋non-null assignment scope key |
| Point Account | `active` | tenant＋membership＋program；依 shop NULL／NOT NULL 分開 |
| Referral Relationship | `active` | tenant＋member |
| Attribution Record | `active`／`unattributed` | tenant＋conversion |
| Attendance Record | `confirmed` | tenant＋session＋membership |

### Create Active

- 不使用「先查是否存在，再 Insert」作唯一性保證。
- Command 在完成 scope、permission、fingerprint 與 eligibility 驗證後直接 Insert effective row；Partial Unique Index 選出唯一 Winner。
- Unique Conflict 的 loser 不建立第二個效果，保存安全 Conflict Stored Result；相同 Idempotency Key 依原結果回傳。

### Replace／Correct Active

- 關閉舊 effective row與建立新 effective row必須在同一 local transaction。
- Transaction 內先驗證 old row仍是目前 Winner，再把它轉成 replaced／corrected／revoked 等合法歷史 status，接著 Insert 新 effective row。
- 任一步驟失敗整筆 rollback；既有 Winner 恢復，因此不留下 double-active，也不因中途失敗留下非預期 zero-active。
- Concurrent Replacement 只有一個 transaction 能提交；loser 回明確 Conflict／Already Replaced Result，依 Contract 決定是否用相同 key重讀或重新提出新 Intent。

### Revoke Active

- Revoke 是明確允許 zero-active 的獨立 Command，不和 Replace／Correct 混用。
- Revoke 只把目前 Winner 轉為 revoked／closed／expired 等歷史 status；必須保存 Actor、Reason、Audit 與 Stored Result。

### History and Repair

- Historical row 不得直接 UPDATE 回 effective status；若 Contract 明確允許恢復，也必須建立新版本並走相同唯一 Winner 流程。
- Reconciliation 偵測 effective count `> 1`、Replace／Correct 後非預期 `0`、非法 status transition 與 scope-key drift。
- Repair 不直接改歷史 row成 Active；由 Owner Command、Idempotency、Audit 與必要人工核准建立新版本。

## Candidate Boundaries

### Identity Linking

```text
Resolve Identity → Validate Conflict → Claim Active Uniqueness
→ Link Mapping → Store Idempotency Result → Minimal Audit
```

Provider verification 在 transaction 之前；merge／recovery approval 不塞入自動 linking transaction。

### Tenant Membership Creation

```text
Resolve Platform User → Validate Tenant → Claim Active Membership
→ Create Membership → Store Result → Audit
```

Optional Referral Candidate 是後續 command／event，不要求跨 Module atomicity。

### Permission Assignment

```text
Validate Actor／Role／Scope → Normalize Core or Tenant Role Scope
→ Enforce Role＋Mapping／Assignment Composite FK
→ Validate Subject Business Reference → Create or Revoke Assignment
→ Invalidate Cache Candidate → Audit
```

Platform Assignment 只能使用 Core Template；Tenant／Brand／Shop Assignment 只能使用同 Tenant 的 Tenant-defined Role。Role／Mapping／Assignment scope 與 Brand／Shop Tenant hierarchy 是 DB-enforced candidate；polymorphic subject existence、membership eligibility 與 policy evaluation 是 Permission Engine application invariant。Cache invalidation failure 不能回滾 authoritative D1 assignment，但需 retry／alert。

### Point Grant

```text
Claim Idempotency → Validate Tenant／Account／Rule
→ Insert Formal Ledger Entry → Update Projection Candidate
→ Store Result → Minimal Audit
```

### Point Deduct／Redeem

```text
Claim Idempotency → Validate Tenant／Account／Balance
→ Insert Formal Ledger Entry → Update Projection Candidate
→ Store Result
```

```text
Insufficient Balance → Store Rejected Result → No Ledger Entry
```

Projection 是否與 Ledger 同一 transaction 更新待 hot-account evidence；無論策略，Ledger 都是 truth，failed intent 不進 Ledger。

### Referral Confirmation／Correction

```text
Claim Command → Validate Same Tenant／No Self／No Cycle／Eligibility
→ Close Existing Candidate if approved → Insert Relationship Version
→ Store Result → Audit
```

Cycle 是 application graph validation；不能只依 CHECK。

### Attribution Decision／Correction

```text
Claim Conversion Decision → Load Valid Touch Window／Policy
→ Insert Active Decision or Unattributed → Store Result → Audit
```

Correction 先驗證 approval，再於同一 local transaction 關閉舊 effective record並建立新 record；不改 Referral。

### Attendance Confirmation

```text
Claim Attempt → Validate Identity／Session／Evidence／Duplicate
→ Insert Attempt → Insert Formal Attendance Record → Store Result
→ Publish Event Candidate
```

Point Grant 不強制在同一跨 Module transaction。Event／Queue／Notification 尚未實作。

### Redemption

```text
Create Intent → Validate Merchant／Member／Tenant／Shop
→ Issue Point Command → Record Stable Result／Point Reference
```

Point timeout 先 query Stored Result；不可用新 key 盲目扣點。Notification failure 不回滾完成交易。

### Idempotency／Audit

Platform 與 Tenant Idempotency 使用不同 Scope 與唯一性空間。Tenant command 在 claim 前先解析 validated `tenant_id`；Tenant Domain write 只能以 Tenant-aware Composite FK 連結相同 Tenant Idempotency Record，不能引用 Platform Scope 或其他 Tenant。Idempotency claim 與同一 local domain write 的組合需按 owner module設計；Audit failure policy 依風險決定。

Audit 建立前先解析合法 Platform／Tenant／Brand／Shop Scope；CHECK 排除任意 nullable 組合，Composite FK 驗證 Brand／Shop hierarchy。Actor／Resource polymorphic reference 仍由 application 驗證。Audit 只存最小 reference，不接管 Domain record。Cross-database audit 若存在只能以可靠 event／reconciliation 協作，不能宣稱 atomic。

## Failure and Recovery

Temporary failure 使用原 key retry；unknown result 先 reconcile；completed transaction 用 Reverse／Correct；永久 validation failure保存安全 Stored Result。Queue、event outbox、transaction API 與 dead-letter strategy 留待 Runtime Sprint。
