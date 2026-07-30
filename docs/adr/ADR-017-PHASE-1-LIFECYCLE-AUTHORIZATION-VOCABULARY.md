# ADR-017: Fix the Phase 1 Lifecycle and Authorization Vocabulary

## 基本資料

- 狀態：Accepted
- 日期：2026-07-30
- 決策人：Tony
- Architecture Owner Approval：Accepted by Tony
- Approval Date：2026-07-30
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Supersedes：None
- Superseded By：None
- 相關範圍：Identity Core、Tenant Access、Authorization

## 背景與問題

Conceptual documents contain broad candidate states and roles, while Phase 1 requires a smaller unambiguous lifecycle and minimum Permission vocabulary.

## 候選方案

1. Implement every candidate state and role.
2. Leave vocabulary undefined until coding.
3. Freeze a Phase 1 subset and keep other workflows in future Modules.

## 最終決策

- Platform User: `active`, `suspended`, `merged`, `anonymized`; no `deleted`.
- Identity Mapping: `active`, `revoked`, `conflict`; Pending／Verified remain verification workflow states.
- Tenant Membership: `active`, `suspended`, `closed`, `merged`; Invited／Pending belong to a future Invitation Module.
- Core Roles: `tenant_owner`, `tenant_admin`, `tenant_member`.
- Core Permissions: `tenant:read`, `tenant:update`, `membership:read`, `membership:manage`, `role:read`, `role:manage`, `platform_user:read_self`, `external_identity:read_self`.
- Core Roles are system-managed; Tenant Custom Roles use only approved Permissions and cannot impersonate Core Roles.
- A Tenant always retains one effective `tenant_owner`.

## 決策理由

The subset matches the smallest safe Runtime slice and keeps invitation, Provider verification and broader organizational roles outside Phase 1.

## 影響與風險

- Runtime states and authorization tests become finite and reviewable.
- Future Invitation and expanded roles require separate contracts.
- Last-owner correctness needs an atomic guard in future physical design.

## 後續工作

- [x] Tony 核准本 ADR（Approved in PR #12）。
- [ ] Runtime tests prove every allowed and forbidden transition.
- [ ] Future Invitation Module defines invited／pending without changing Membership meaning.

## 重新檢討條件

- A reusable cross-SaaS requirement cannot be expressed without a new lifecycle state or Permission.

## 相關文件

- [Lifecycle State Model](../31-LIFECYCLE-STATE-MODEL.md)
- [Authorization Contract](../runtime-phase-1/03-AUTHORIZATION-CONTRACT.md)
