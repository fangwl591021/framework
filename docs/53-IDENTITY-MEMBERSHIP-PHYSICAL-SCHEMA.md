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

Membership Merge 使用 `(tenant_id, merged_into_membership_id) → tenant_memberships(tenant_id, id)`，並保留 `merged_into_membership_id <> id`，因此 DB 拒絕跨 Tenant target 與直接 self-merge。Merge chain 無循環、Source／Target 同一 Platform User（或具有正式 Identity Merge 核准）、Merged Membership 不再作 Active Business Subject，仍是 Membership Engine 在 merge transaction 內驗證的 application-only invariants。

### `shop_memberships`

直接含 `tenant_id`、`tenant_membership_id`、`shop_id`、`status`、`active_marker` 與 lifecycle timestamps。Composite FK 候選：

- `(tenant_id, tenant_membership_id)` → membership `(tenant_id, id)`
- `(tenant_id, shop_id)` → shop `(tenant_id, id)`

確保 `shop.tenant_id = tenant_membership.tenant_id`。Active uniqueness candidate：membership＋shop＋marker。

## Role and Permission

- `permissions` 是固定 Core vocabulary：`resource`、`action`、`status`；前端名稱不是安全判斷。
- 本 Proposal 採單一 `roles` 表＋normalized scope，不在本輪拆成 `core_roles`／`tenant_roles`。單表可共用 version／status 與查詢，但必須攜帶 scope discriminator；分表可讓 FK 更直觀，代價是 mapping／assignment 查詢與 lifecycle 規則重複。Architecture Owner 可在批准前改選分表，不影響本輪 Tenant Isolation 目標。
- `roles`、`role_permissions`、`role_assignments` 都保存 `role_scope_type`、`tenant_id`、`tenant_scope_key`。Core Template 固定為 `core_template + tenant_id NULL + tenant_scope_key='platform'`；Tenant-defined Role 固定為 `tenant_defined + tenant_id NOT NULL + tenant_scope_key='tenant:' || tenant_id`。
- `roles` 提供 `UNIQUE (tenant_scope_key, id)`；Mapping 與 Assignment 使用 `(tenant_scope_key, role_id)` Composite FK。Tenant A 的 Mapping／Assignment 因 scope key 不同，不能引用 Tenant B Role；Platform Assignment 只能引用 Core Template。
- `role_permissions` 的 Core Mapping 與 Tenant Mapping 使用相同 normalized rule，不能把 optional `tenant_id` 與獨立 `role_id` 任意組合。
- `role_assignments` 以 CHECK 限定合法 scope 組合：Platform 不得有 Tenant／Brand／Shop；Tenant／Own／Assigned 不得有 Brand／Shop；Brand 必須有同 Tenant Brand；Shop 必須有同 Tenant Shop。為避免 nullable hierarchy 模糊，Role Assignment 的 Shop Scope 不同時保存 Brand。
- `subject_reference` 仍是 polymorphic business reference。Subject 實際存在、Tenant Membership 可用、Integration Service 授權與敏感 command 的即時 permission evaluation，明確列為 application-only invariant，不宣稱由 FK 完整覆蓋。

## DB-enforced and Application-enforced Invariants

| Rule | DB-enforced candidate | Application-enforced remainder |
| --- | --- | --- |
| Provider identity single active owner | UNIQUE＋active marker | normalization、hash collision、recovery |
| User single active tenant membership | UNIQUE＋active marker | concurrent lifecycle transition |
| Membership Merge same Tenant／not self | Tenant-aware composite FK＋CHECK | no cycle、same Platform User／approved Identity Merge、merged subject inactive |
| Shop／Membership same Tenant | composite FK | parent lifecycle eligibility |
| Core／Tenant Role separation | normalized scope CHECK＋composite FK | role policy semantics、template publication |
| Role Mapping／Assignment same Tenant | `tenant_scope_key + role_id` composite FK | subject polymorphism、current membership eligibility |
| Brand／Shop Assignment same Tenant | legal-combination CHECK＋composite FK | policy evaluation、assigned-record resolution |

SQL：[001-core-identity-membership.sql](schema/proposals/001-core-identity-membership.sql)。
