# Rollback／Forward Fix Runbook

## Recovery Modes

| Mode | 使用時機 | Authority／限制 |
| --- | --- | --- |
| Schema Rollback | 尚未承載不可逆資料且 rollback evidence 已核准 | 需獨立執行核准；不得假設所有 DDL 可逆 |
| Data Rollback | 有可證明的 inverse 且不破壞歷史 | Ledger、Audit、Completed Transaction 不得刪除 |
| Forward Fix | 已有正式歷史或 schema rollback 風險較高 | 新 migration、correction 或 repair 必須再經 Gate |
| Feature Disable | Domain write 可由 feature boundary 暫停 | 不等於資料已修復 |
| Traffic Stop | 無法安全接受新寫入 | 依 incident authority 立即停止 |
| Read-only Mode | 保留查詢、禁止 effect | 需驗證 cache 不會偽裝 authoritative state |
| Account Freeze | 單一 Point Account drift／風險 | 停止高價值 Point Effect，保留調查證據 |
| Migration Pause | Phase exit evidence 不完整 | 不得跳過 Phase 或繼續 constraint tightening |

## Decision Procedure

1. 記錄 Run ID、Phase、首個錯誤、受影響 scope 與最後已知成功點。
2. 立即停止後續 Phase；保留 error、hash、audit 與 before／after evidence。
3. 判斷是否已有不可逆 domain history、Ledger effect 或 external side effect。
4. 由 Architecture、Security、Migration Operator 共同選擇 rollback 或 forward fix；Production 另需 Product Owner。
5. 執行後跑完整 reconciliation，不以 command success 取代資料一致性證據。

## Trigger／Constraint Failure

預期負向案例的 constraint／trigger abort 應留下失敗結果與整批 rollback evidence。非預期 error 必須將該 Phase 標為 NO-GO，禁止以停用 constraint、任意更新或刪除 rows 繞過。

## Ledger Rule

Point Ledger 是正式資產異動歷史。Rollback 永不刪除 Ledger；已完成 effect 只能依核准 Contract 使用 Reverse／Adjust／Correction。Failed Intent 仍只保存於 Idempotency Record／Command Result／必要 Audit／Log。

## Production Boundary

Production rollback、restore、traffic stop 與 forward fix 都需要獨立 Approval 與操作紀錄；Package Design 或 Staging Approval 不能授權 Production action。

## Trigger／Constraint Disable Policy

Trigger 或 Constraint 發生非預期錯誤時，先採 Feature Disable、Traffic Stop、Read-only、Account Freeze 或 Migration Pause；不得直接移除 guard 繼續寫入。任何 trigger revision、constraint relaxation 或暫時停用都視為新的 schema change，必須有 impact analysis、isolated evidence、forward-fix plan 與獨立執行核准。
