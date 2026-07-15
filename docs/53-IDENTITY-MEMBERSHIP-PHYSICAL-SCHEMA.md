# Identity and Membership Physical Schema

> Proposal Only · Do Not Execute · Schema Not Approved

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

## Identity

### `platform_users`

`id TEXT PRIMARY KEY`、`status TEXT CHECK`、`merged_into_user_id TEXT`、`created_at INTEGER`、`updated_at INTEGER`、`anonymized_at INTEGER`。`merged_into_user_id` self-FK uses `RESTRICT`；Application validates no merge cycle. Table 不保存 Provider UID、Email、Phone、Tenant Profile、Point Balance 或 Referrer。

### `identity_mappings`

候選欄位：`id`、`platform_user_id`、`provider`、`provider_subject_hash`、`provider_context`、`verification_status`、`status`、`active_marker`、`linked_at`、`last_verified_at`、`revoked_at`、timestamps。

- Active uniqueness candidate：`provider + provider_context + provider_subject_hash + active_marker`；active row 使用 `'active'`，inactive row 使用 `NULL`，利用 SQLite UNIQUE 對多個 `NULL` 的語意保留歷史。
- Provider Subject 預設提出 keyed hash／opaque digest；是否需要可逆原值、key rotation 與 Email／Phone 獨立 verification table 需 Security／Identity ADR。
- Hash 不取代 Provider 驗證；collision／normalization／context version 仍由 Identity Transaction 驗證。

## Organization

- `tenants`：`id`、`status`、`name_reference`、UTC timestamps；name 只是管理顯示，不作 key。
- `brands`：直接含 `tenant_id`；`brand_id` 永遠不能取代 Tenant Scope。
- `shops`：直接含 `tenant_id`，`brand_id` optional；composite FK 候選確保 optional brand 與 shop 同 Tenant。
- 三表不使用一般 Cascade Delete；停用以 status／archived timestamp 表達。

## Membership

### `tenant_memberships`

候選：`id`、`tenant_id`、`platform_user_id`、`status`、`active_marker`、`join_source`、`joined_at`、`suspended_at`、`merged_into_membership_id`、timestamps。

Active-only uniqueness proposal：UNIQUE `(tenant_id, platform_user_id, active_marker)`；active row=`'active'`，historical row=`NULL`。這是 Proposal，需驗證 concurrent transition 與 invalid marker repair；若不採 marker，替代方案為 D1 支援度確認後的 partial unique index 或 application transaction guard。

### `shop_memberships`

直接含 `tenant_id`、`tenant_membership_id`、`shop_id`、`status`、`active_marker` 與 lifecycle timestamps。Composite FK 候選：

- `(tenant_id, tenant_membership_id)` → membership `(tenant_id, id)`
- `(tenant_id, shop_id)` → shop `(tenant_id, id)`

確保 `shop.tenant_id = tenant_membership.tenant_id`。Active uniqueness candidate：membership＋shop＋marker。

## Role and Permission

- `permissions` 是固定 Core vocabulary：`resource`、`action`、`status`；前端名稱不是安全判斷。
- `roles` 可為 Core Template 或 Tenant-defined；`tenant_id NULL` 僅允許 Core role，Tenant role 必須有 tenant scope，此規則由 CHECK＋transaction validation 維護。
- `role_permissions` 使用 composite PK `(role_id, permission_id)`；直接保存 optional `tenant_id` 區分 Core Template 與 Tenant-defined Role，不含 UI label。`tenant_id` 與 role owner 一致性仍由 transaction validation。
- `role_assignments` 保存 subject type／reference、role、tenant／brand／shop scope、effective period、status、active marker 與 audit reference。Subject polymorphism 與 scope hierarchy 是 application-only invariant；敏感 command 每次重驗有效 membership 與 scope。

## Constraint Summary

| Rule | Physical Candidate | Application-only Remainder |
| --- | --- | --- |
| Provider identity single active owner | UNIQUE＋active marker | normalization、hash collision、recovery |
| User single active tenant membership | UNIQUE＋active marker | concurrent lifecycle transition |
| Shop／Membership same Tenant | composite FK | parent lifecycle eligibility |
| Tenant role cannot grant Platform scope | CHECK candidate | permission policy evaluation |
| Merge no cycle | self-FK RESTRICT | graph validation／approval |

SQL：[001-core-identity-membership.sql](schema/proposals/001-core-identity-membership.sql)。
