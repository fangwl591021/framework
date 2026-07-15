# Transaction Boundary Proposal

> Proposal Only · No Runtime · No SQL Executed

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

本 Proposal 選定單一 D1 database 作 Point correctness boundary；Point 成功效果必須由單一 local transaction 的條件式寫入、Unique／CHECK／FK 與 generation fencing共同保證。本 Proposal 不假設跨 database、Module、Queue、Provider 或 Notification 的分散式 transaction，也不把 D1 Session 或 Durable Object 當成資料庫約束的替代品。

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

### Point Grant／Deduct／Redeem／Expire／Reverse／Adjust

初版使用同步 Authoritative Projection Row，所有正式 Point Effect 都走相同 Account Version Boundary。Claim Record 可以先用無 Domain Effect 的短 transaction 建立，但成功資產提交必須在單一 D1 local transaction 重新驗證目前 owner＋`processing_generation`。

```text
Validate current Idempotency owner + generation + fingerprint
→ Conditional UPDATE Projection
   WHERE consistency_status='healthy'
     AND projection_version=expected_version
     AND balance + signed_amount >= 0
→ Increment projection_version and set ledger_watermark=transaction_id
→ Insert exactly one Ledger Entry with same version/resulting_balance
→ Mark same Idempotency generation Completed with Stored Result
→ Commit
```

- Grant、正 Adjust、Full Reverse 也必須更新同一 Projection／Version；負 Adjust、Expire、Deduct、Redeem 都必須通過 non-negative guard。
- 初版使用單一 D1 `batch()`。owner＋generation CAS先把同一 Result Reference暫存為Completed；Projection UPDATE再驗證該 Completed generation、healthy status、expected version與non-negative balance；Ledger Insert以緊接前一個 guard statement的 affected-row evidence作constraint assertion。guard不是精確一筆時 Ledger statement必須失敗，使 Idempotency、Projection與Ledger整批rollback；禁止commit後才檢查或補償。
- uq_point_transactions_account_version、uq_point_transactions_idempotency_effect 與 business reference uniqueness共同選出唯一 Ledger Winner。若 immediate FK要求先把同 generation Idempotency轉為Completed，該 update與Ledger Insert仍須同 transaction；任何後續失敗都回滾兩者。
- Insufficient Balance 在無 Domain Effect 的 guarded result transaction 將同 generation標為 Failed Permanent，保存安全 Stored Result，不建立 Ledger。
- Single Full Reverse 需在 transaction 內載入 eligible Original，驗證 Original 不是 Reverse、同 Tenant／Account、signed amount精確相反；`uq_point_transactions_single_full_reverse` 阻止第二筆 Full Reverse。
- Ledger 是長期 Source of Truth；Projection 同時是同步 concurrency guard。Projection Drift 時將 Account Guard標為 `drifted`，停止所有 Point Effect，Rebuild／Verify 後才可恢復 `healthy`。
- D1 Sessions 只提供 read consistency，不是跨 Request lock。Durable Object 只有量測到 conflict／retry／contention／p95／p99 或 burst證據後才可選用，且任何繞過 DO 的路徑仍受相同 D1 transaction與constraint保護。

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

Platform 與 Tenant Idempotency 使用不同 Scope 與唯一性空間。Tenant command 在 claim 前先解析 validated `tenant_id`；Tenant Domain write 只能連結相同 Tenant Idempotency Record。Point Transaction 另綁定 Completed Status 與目前 `processing_generation`，且同一 Idempotency Record 最多一筆 Ledger Effect。Claim／Takeover 使用 CAS：只有當 status、owner／expiry 與 generation 符合預期時才可取得下一 generation；所有 terminal result與 Point commit 都需驗證目前 generation，stale owner只能得到 Conflict／Stored Result，不能提交 Domain Effect。Audit failure policy依風險決定。

Audit 建立前先解析合法 Platform／Tenant／Brand／Shop Scope；CHECK 排除任意 nullable 組合，Composite FK 驗證 Brand／Shop hierarchy。Actor／Resource polymorphic reference 仍由 application 驗證。Audit 只存最小 reference，不接管 Domain record。Cross-database audit 若存在只能以可靠 event／reconciliation 協作，不能宣稱 atomic。

## Point Failure Matrix

| Scenario | Unique Final Effect | Stored Result／Retry | Audit／Repair Boundary |
| --- | --- | --- | --- |
| Two concurrent deducts | Projection balance＋expected version只允許合法 Winner；不可負餘額 | Winner Completed；loser Insufficient或Version Conflict | loser不建 Ledger；記 conflict／insufficient metric |
| Same key, same fingerprint | `uq_point_transactions_idempotency_effect` 最多一筆 | Processing回處理中；Completed回原結果 | 不重放 |
| Same key, different fingerprint | 無第二效果 | Conflict Stored Result；不可 retry為相同 Intent | 必要 security audit |
| Commit succeeded, response lost | Ledger、Projection、Completed Result已同 transaction提交 | 原 key查 Stored Result／Ledger Reference | 禁止新 key盲目扣點 |
| Lease takeover | CAS 遞增 generation；只有新 generation可提交 | takeover前先查 Domain／Stored Result | 記 owner、old/new generation |
| Stale owner returns | owner＋generation predicate更新零筆，無效果 | Conflict／讀取現況 | 不覆寫新 Owner結果 |
| Projection updated, Ledger insert fails | 整個 local transaction rollback | 原 key可安全 retry | 若偵測 partial state立即標 drifted／incident |
| Ledger insert succeeds, Stored Result completion fails | 整個 local transaction rollback | 原 key可安全 retry | 不允許正常路徑留下 Processing＋Ledger |
| Reverse replay | Idempotency Unique＋Single Full Reverse Unique選出一筆 | 回原 Reverse或Already Reversed | 不建立第二筆 Reverse |
| Projection drift | Account Guard進入 `drifted`，停止 Point Effect | 回 Unavailable／Reconciliation Required | rebuild projection only；Ledger不可改 |
| Hot account burst | D1 guard仍是 correctness boundary | bounded same-key retry | 量測達門檻才啟用 per-account DO優化 |

## Failure and Recovery

Temporary failure 使用原 key retry；unknown result 先查 Idempotency、Ledger Reference、Account Version與Projection Watermark，再進 reconciliation；completed transaction用 Reverse／Adjust；永久 validation failure保存安全 Stored Result。Queue、event outbox、Runtime API與 dead-letter strategy仍留待 Runtime Sprint，但不得改變本文件的 D1-only correctness boundary。
