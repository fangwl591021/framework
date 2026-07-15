# Framework RC1 Release Baseline

## Release Identity

| 欄位 | 值 |
| --- | --- |
| Release Name | Framework RC1 |
| Release Type | Architecture Release Candidate |
| Repository | `fangwl591021/framework` |
| Baseline Commit | `6dd23c30dd496a4892660c71b33349c2695ecb67` |
| Release Status | Documentation Baseline |
| Runtime Status | Not Implemented |
| Migration Status | Not Executed |
| Verification Status | Not Verified |
| Production Status | Not Deployed |

## Included Capabilities

- Platform Core。
- Five-layer Architecture。
- Tenant Boundary。
- Identity Mapping。
- Tenant Membership。
- Shop Membership。
- Permission Boundary。
- Point Engine Contract。
- Referral Engine Contract。
- Attribution Engine Contract。
- Attendance Engine Contract。
- Redemption Engine Contract。
- Logical Data Model。
- Physical Schema Proposal。
- Architecture Handbook。
- ADR-001～ADR-012。
- Architecture Review Gate 1～3 Result。
- Migration／Rollback／Reconciliation Proposal。
- Module Contract／Registry 與 Cloudflare Adapter Boundary 治理。

## Not Included

- Runtime Repository。
- Worker。
- API。
- D1 Database。
- Executed Migration。
- Local D1 Evidence。
- Isolated D1 Evidence。
- Integration Tests。
- Performance Tests。
- Staging。
- Production。

## Release Meaning

RC1 freezes architecture intent and documentation boundaries.

RC1 does not authorize execution.

RC1 不代表 Physical Schema 已執行、D1 已驗證、效能已驗證或 Production Ready。Proposal SQL 與 documentation-only migration draft 仍不得執行。

## Status Separation

`Documented`、`Contracted`、`Proposed`、`Implemented`、`Verified`、`Approved for Execution`、`Executed` 與 `Production Ready` 是彼此獨立狀態，不得由前一狀態推導後一狀態。

## 相關文件

- [Component Matrix](RC1-COMPONENT-MATRIX.md)
- [Known Limitations](RC1-KNOWN-LIMITATIONS.md)
- [Freeze Policy](RC1-FREEZE-POLICY.md)
- [Migration Package Status](../migration-package/00-PACKAGE-STATUS.md)
