# Reconciliation Runbook

> Reconciliation 先偵測、隔離與產生證據；不得自動挑選 Winner、重新啟用歷史資料或刪除 Ledger。

| Reconciliation | Detection | Severity | Auto Fix Allowed | Manual Review | Owner | Evidence | Exit Criteria | Audit | Escalation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Point Ledger vs Projection balance | ledger fold 與 balance 比對 | Critical | No | Required | Point Owner | account hash、delta | reviewed delta is zero or account remains frozen with approved incident record | Required | freeze account／Architecture |
| Ledger watermark | latest eligible ledger 與 watermark 比對 | Critical | No | Required | Point Owner | ids／versions | watermark equals latest eligible ledger, or Point Effect remains stopped | Required | stop Point Effect |
| Account version | version sequence gap／duplicate | Critical | No | Required | Point Owner | sequence report | no gap/duplicate, or documented forward-fix is separately approved | Required | Architecture |
| Negative balance | authoritative projection below zero | Critical | No | Required | Point Owner | balance evidence | no negative balance, or account remains frozen pending decision | Required | Security／Product |
| Multiple active membership | active count greater than one | High | No | Required | Membership Owner | scope count | count is one or conflicting records are quarantined with decision record | Required | Architecture |
| Multiple active point account | effective scope count greater than one | Critical | No | Required | Point Owner | account scope | count is one or Point Effect remains stopped | Required | stop Point Effect |
| Multiple active referral | member active referrer count greater than one | High | No | Required | Referral Owner | relationship chain | count is one or manual decision is recorded | Required | Architecture |
| Multiple active attribution | conversion effective result count greater than one | High | No | Required | Attribution Owner | decision records | count is one or conversion remains blocked | Required | Architecture |
| Duplicate attendance | session/member effective count greater than one | Medium | No | Required | Attendance Owner | record references | count is one or domain owner accepts documented exception | As needed | Domain Owner |
| Redemption vs Point | completed redemption 與 ledger business ref 比對 | Critical | No | Required | Redemption＋Point | intent/result/effect refs | one matching effect or redemption remains stopped | Required | stop redemption |
| Idempotency vs Domain | completed result 缺 domain effect 或 effect 重複 | Critical | No | Required | Platform Core | fingerprint/generation/ref | one matching effect/result pair or operation remains blocked | Required | Security |
| Tenant scope | parent／child tenant mismatch | Critical | No | Required | Data Owner | composite refs | zero mismatches or affected target remains isolated | Required | Security |
| Orphan reference | required parent missing | High | No | Required | Data Owner | orphan list without PII | zero orphans or reviewed repair plan is approved | Required | Architecture |
| Missing audit | required event 無 audit reference | High | No | Required | Security Owner | event IDs／time | zero missing required audits or Security accepts exception | Required | Security |
| Trigger drift | deployed definition hash 不符 approved hash | Critical | No | Required | Migration Operator | schema hash | exact hash match; otherwise promotion stays paused | Required | pause migration |
| Migration phase drift | recorded phase 與 observed objects 不符 | Critical | No | Required | Migration Operator | phase manifest | phase/object match or Execution Approver records forward-fix decision | Required | Execution Approver |

## Resolution Rules

- Auto Fix 預設為 No；若未來允許，必須有新 Contract、idempotent repair、dry-run 與 rollback evidence。
- 證據不得包含 Secret 或完整 PII payload。
- Critical finding 在關閉前不得 Promote；Point drift 必須維持 account freeze 或 effect stop。
