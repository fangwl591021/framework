# Migration Readiness Checklist

> 初始狀態全部未完成；本 Sprint 不得把此 Checklist 全部勾選。

- [ ] Package Designed。
- [ ] RC1 Baseline Confirmed。
- [ ] Schema Hash Recorded。
- [ ] Migration Hash Recorded。
- [ ] Migration Dependency Reviewed。
- [ ] Test Plan Approved。
- [ ] A01～A06 Executed。
- [ ] Constraint Tests Executed。
- [ ] Trigger Tests Executed。
- [ ] Atomicity Tests Executed。
- [ ] Local D1 Passed。
- [ ] Isolated D1 Passed。
- [ ] Rollback Tested。
- [ ] Forward Fix Tested。
- [ ] Reconciliation Tested。
- [ ] Architecture Approved。
- [ ] Security Approved。
- [ ] Execution Approved。
- [ ] Change Window Approved。
- [ ] Operator Assigned。
- [ ] Backup Confirmed。
- [ ] Monitoring Confirmed。
- [ ] Go／No-Go Signed。

## Additional Evidence

- [ ] Deterministic synthetic fixture 與 Cleanup Plan 已核准。
- [ ] Concurrency、Replay、Fencing、Lost Response 已驗證。
- [ ] Query plan、Index cost 與 capacity evidence 已建立。
- [ ] Evidence Registry 綁定 commit、schema hash、migration hash、Run ID 與 reviewer。
- [ ] Product Owner 已核准 Production impact。

目前結論仍為 NO-GO；任何未完成項都不得以 PR 合併狀態取代。
