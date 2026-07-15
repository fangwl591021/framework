# ADR-010: Use First Valid Referrer as the Default Referral Policy

## 基本資料

- 狀態：Accepted
- 日期：2026-07-15
- 決策人：Tony
- Architecture Owner Approval：Accepted by Tony
- Approval Date：2026-07-15
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Supersedes／Superseded By：None／None
- 相關範圍：Referral Engine、Membership

## 背景與問題

會員可能點擊多個邀請或在不同通道加入；若後續分享能覆寫 Referrer，長期 Membership Relationship 會與 Marketing Touch 混淆。

## 限制條件

- Tenant-scoped、Single-Layer、No Self、No Cycle。
- Referral 與 Attribution 分離。
- Correction 保存歷史與 Audit。

## 候選方案與比較

| 方案 | 優點 | 缺點 | 風險 | 可回滾性 |
| --- | --- | --- | --- | --- |
| First Valid Referrer | 穩定、可稽核 | 後續推廣者不改長期關係 | 較低 | 高 |
| Last Referrer | 反映最近分享 | 容易覆寫與操縱 | 高 | 中 |
| Admin-only Assignment | 控制強 | 營運成本高 | 人工錯誤 | 中 |

## 最終決策

第一個有效 Referral 成為 Active Direct Referrer；後續分享不自動覆蓋。預設單層，Confirmed 後會員不得 Self-service Change。Admin Correction 需理由、Permission、Requester／Approver 或核准流程與 Audit，並保存舊 Relationship。

## 決策理由與影響

此規則提供穩定 Membership Relationship，並允許 Attribution 獨立反映後續 Touch。Tenant 可在 Confirmation 前配置短暫 Pending Window，但不能突破安全 Invariants。

## 風險與後續工作

- Invitation race 需 Idempotency／concurrency 設計。
- [ ] 定義 Candidate ordering、Confirmation time 與 correction approval contract tests。

## 重新檢討條件

正式案例需要不同 Confirmation Policy，且不會導致 Cross-tenant、Self、Cycle 或歷史覆寫。

## 相關文件

- [Referral Engine Contract](../35-REFERRAL-ENGINE-CONTRACT.md)
- [ADR-007](ADR-007-SINGLE-LAYER-REFERRAL-DEFAULT.md)
