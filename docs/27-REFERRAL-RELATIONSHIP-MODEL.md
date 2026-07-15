# Referral Relationship Model

> **Conceptual Model / Not a Database Schema**

Referral Relationship 表示 Tenant 內被推薦人加入時形成的長期、直接關係。它不是每次點擊，也不是每筆訂單的歸因。

## Framework Default Candidate Policy

- Tenant-scoped；不跨 Tenant。
- Single-layer；只保存直接推薦關係，不預設多層上線鏈。
- 每個 Tenant Membership 同時最多一個目前有效的 Direct Referrer。
- First Valid Referrer 為預設建立 Policy。
- 一般分享、再次點擊或後續 Campaign 不覆寫既有有效關係。
- 禁止 Self-referral 與 Cycle。
- Admin Override、Correction 或 Migration 必須保留舊值、原因、Actor 與時間。

這是 Framework 的預設候選 Policy，不代表所有 Tenant 被強制採用相同商業規則；任何差異仍必須明確版本化且不得突破 Tenant Boundary。

## 建立時點

```text
Clicked
  → Identity Resolved
  → Membership Created
  → Referral Confirmed
```

只有 Click 不建立 Referral Relationship。必須先解析身份，成功建立或確認同 Tenant Membership，再依當時有效 Policy 驗證推薦者資格並 Confirm。

## 來源

- Invite Link
- Referral QR Code
- Campaign Link
- Admin Assignment
- Migration
- OCR Claim Invitation

每個來源都需保留 Source Reference、Occurred At 與 Policy Version。

## 變更政策

預設不允許一般使用者重設 Referrer。Tenant 若需申訴期、首次交易前改綁或 Admin Correction，必須明確定義：允許角色、時限、有效性檢查、歷史保存、下游 Compensation 與 Audit。

## 與 Attribution 的差異

- Referral 回答「誰建立了這個 Tenant Membership 的長期直接推薦關係？」
- Attribution 回答「哪個 Touch 依某版本 Policy 對這次 Conversion 負責？」
- 一人可有一個有效 Referral Relationship、許多 Attribution Touch、每個 Conversion 一個有效 Attribution Record。

相關決策見 [ADR-005](adr/ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md) 與 [ADR-007](adr/ADR-007-SINGLE-LAYER-REFERRAL-DEFAULT.md)。
