# Migration Dependency Order

> Design only。禁止 Big Bang Migration；每一 Phase 必須獨立滿足 Entry、Validation 與 Exit Criteria。

| Phase | Dependency | Tables | Indexes | Triggers | Preconditions | Validation | Rollback Strategy | Forward Fix Strategy | Exit Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 — Preconditions and Feature Freeze | RC1 | 無 | 無 | 無 | baseline、proposal hash、owner、stop rule 鎖定 | 文件、hash、authority 一致 | 取消窗口 | 修正 package 後重審 | Freeze evidence 完整 |
| 1 — Platform／Tenant／Identity | Phase 0 | platform users、tenants、brands、shops、identity mappings | PK／FK／identity winner | 無 | ID／time decision 已核准 | hierarchy、scope、orphan、identity winner | 無資料時 schema rollback | additive correction | Platform／Tenant boundary PASS |
| 2 — Membership／Permission | Phase 1 | tenant／shop memberships、permissions、roles、mappings、assignments | composite FK、partial unique、assignment scope | 無 | Tenant hierarchy 有效 | cross-tenant、active winner、role scope | stop writes；安全時 schema rollback | constraint／scope forward fix | Gate 1／2 evidence PASS |
| 3 — Audit／Idempotency | Phase 1 | audit records、idempotency records | platform／tenant namespace unique | 無 | retention draft、payload restriction | scope、replay、fingerprint、generation | 保留 domain history | metadata／retention forward fix | namespace 與 stored result PASS |
| 4 — Point Program／Account／Projection | Phase 2、3 | point programs、accounts、balance projections | account winner、version／balance | 無 | membership／idempotency 可用 | scope mode、healthy、initial balance | account freeze | projection／constraint forward fix | projection prerequisites PASS |
| 5 — Point Ledger／Triggers／Indexes | Phase 4 | point transactions | effect、version、single reverse、query indexes | projection guard、reverse guard | A01～A06 fixture 核准 | guard abort、atomic rollback、reverse winner | Ledger 不刪除；pause／freeze | approved correction migration | Gate 3 與 A01～A06 PASS |
| 6 — Referral／Attribution | Phase 2、3 | invitations、relationships、links、touches、conversions、attribution | active referral／attribution | 無 | membership scope 可驗證 | relationship／decision separation | feature disable | correction records／constraint fix | Domain invariants PASS |
| 7 — Attendance／Redemption | Phase 2、3、5 | events、sessions、attempts、records、intents、results | attendance winner、business reference | 無 | point effect boundary 可用 | session tenant、replay、effect correlation | stop effects；Ledger 不刪除 | correction／reconciliation | consistency PASS |
| 8 — Validation／Reconciliation | Phase 1～7 | 無新增 | 僅核准 detection candidates | 無 | Phase evidence 完整 | orphan、scope、winner、ledger／projection | 保持 pause／read-only | manual repair package | blockers 為零 |
| 9 — Constraint Tightening | Phase 8 | 僅既有表 | 有 evidence 的 constraint／index | 僅已驗證 trigger revision | violation scan 為零 | rerun negative／query／rollback | 安全時 schema rollback | 新 forward-fix migration | 三 Gate 重審 PASS |

任一 Phase 失敗不得跳過依賴。Rollbackability 必須在執行核准前判定；已有正式 Ledger／Audit 歷史時不得以刪除資料偽裝回滾。
