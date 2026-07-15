# Referral and Attribution Physical Schema

> Proposal Only · Do Not Execute · Referral and Attribution Remain Separate

## Status

- Design Status: Proposed
- Schema Status: Not Approved
- Migration Status: Not Executed
- Runtime Status: Not Implemented
- Verification Status: Not Verified
- Production Status: Not Deployed

## Referral

### `referral_invitations`

`id`、`tenant_id`、`inviter_membership_id`、`token_hash`、`purpose`、`status`、`expires_at`、`created_at`、`revoked_at`。Token 原值不得保存；hash normalization／rotation 待 Security Design。

### `referral_relationships`

`id`、`tenant_id`、`member_membership_id`、`referrer_membership_id`、`status`、`source`、`confirmed_at`、`replaced_by_relationship_id`、timestamps、`audit_reference`。

- CHECK 防 self-referral；composite FK 防 cross-tenant。
- Partial Unique Index `(tenant_id, member_membership_id) WHERE status='active'` 維護單一 active direct referrer；replaced／revoked／corrected history 不進 index。
- Cycle 無法靠單列 CHECK 完整驗證，屬 transaction graph validation；correction 保存 replacement chain。

## Attribution

### `share_links`

保存 `token_hash`、promoter membership、content／campaign references、policy version、status、expiry；不保存 token 原值或 content owned data。

### `attribution_touches`

高寫入表：`tenant_id`、optional share link、anonymous visitor hash、optional resolved user／membership、channel、touch type、occurred time、deduplication key、evidence reference、retention class、archive timestamp。

- Anonymous reference 必須不可逆且有 rotation／retention policy。
- resolution 欄位不得繞過 Identity／Membership；同 Tenant 由 composite FK／transaction guard 驗證。
- Touch window candidate 先把 promoter／campaign 解析為 `share_link_id`，再依 tenant＋share link＋occurred time 查詢；不為每個 evidence 欄位加 index。

### `conversions`

本表選擇 **Attribution-owned reference envelope**：只保存 `conversion_type`、`conversion_reference`、tenant、occurred time、source module 與 status，不複製 Order、Payment、Event 或 Redemption owned data。UNIQUE tenant＋type＋reference。

### `attribution_records`

保存 conversion、promoter、winning touch、policy／version、window、decision reason、status、decided／reversed time、correction reference 與 audit reference。

- Partial Unique Index `(tenant_id, conversion_id) WHERE status IN ('active','unattributed')` 確保單一有效 decision；corrected／reversed history 不進 index。
- winning touch、promoter、conversion 必須同 Tenant；由 composite FK／transaction validation。
- `Unattributed` 可有 null promoter／touch；不得猜測或建立 Referral。
- Correction 建立新 record 並關聯舊 record，不 UPDATE 歷史 decision。

## Application-only Invariants

Referral cycle、promoter eligibility at conversion time、attribution window、first／last touch selection、correction approval、token entropy 都不能只靠 row constraint 完成。

SQL：[003-referral-attribution.sql](schema/proposals/003-referral-attribution.sql)。
