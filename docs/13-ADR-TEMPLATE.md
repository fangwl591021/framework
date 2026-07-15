# Architecture Decision Record Template

Architecture Decision Record（ADR）記錄重要且難以逆轉的 Architecture Decision、批准人、取捨與重新檢討條件。ADR 不取代 Module Contract、Implementation Plan 或 Production Verification。

## Decision Status

- `Proposed`
- `Accepted`
- `Superseded`
- `Deprecated`
- `Rejected`

只有 Architecture Owner Tony，或經 Tony 正式授權的人員，能批准重大 ADR 為 `Accepted` 或 `Rejected`。

## 三種獨立狀態

```text
Decision Accepted
Implementation Completed
Production Verified
```

- **Decision Accepted**：Architecture Owner 已接受選定方案。
- **Implementation Completed**：已依 Decision 完成實作，但可能尚未部署或驗證。
- **Production Verified**：已在明確的正式 Scope 取得驗證證據。

三者不是同一件事，不得因 ADR Accepted 宣稱程式已完成，也不得因 Production 可運作推導架構已批准。

## 使用規則

- 每個 ADR 使用唯一、遞增的編號。
- `Accepted` 前必須列出候選方案、比較、風險與回滾考量。
- Decision 改變時建立新 ADR，將舊 ADR 設為 `Superseded`，不得改寫歷史理由。
- 未取得 Tony 批准的內容維持 `Proposed`。
- Implementation Status 與 Verification Status 必須有獨立證據引用。

## Template

```markdown
# ADR-[編號]: [Title]

## 基本資料

- 狀態：Proposed | Accepted | Superseded | Deprecated | Rejected
- 日期：YYYY-MM-DD
- 決策人：
- Architecture Owner Approval：Pending | Accepted by Tony | Rejected by Tony
- Approval Date：N/A | YYYY-MM-DD
- Implementation Status：Not Implemented | In Progress | Completed
- Verification Status：Not Verified | Partially Verified | Production Verified
- Supersedes：None | ADR-XXX
- Superseded By：None | ADR-XXX
- 相關 Module／Application：

## 背景

[描述現況與脈絡。]

## 問題

[用可驗證方式描述問題。]

## 限制條件

- [Security、Tenant、法規、成本、時程、Cloudflare 或相容性限制]

## 候選方案

1. [方案 A]
2. [方案 B]
3. [方案 C]

## 方案比較

| 方案 | 優點 | 缺點 | 風險 | 成本 | 可回滾性 |
| --- | --- | --- | --- | --- | --- |
| A | | | | | |
| B | | | | | |

## 最終決策

[只在 Accepted 後填寫已批准方案。]

## 決策理由

[說明為何在目前限制下選擇此方案。]

## 正面影響

- [預期改善]

## 負面影響

- [已接受代價]

## 風險

- [風險、監控與緩解]

## 後續工作

- [ ] [工作與 Owner]

## 重新檢討條件

- [哪些指標、需求或限制改變時重新評估]

## 相關文件

- [Module Contract、Boundary、ADR 或 PR]
```

## First Accepted ADRs

- [ADR-001: Separate Platform User from Tenant Membership](adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md)
- [ADR-002: Use D1 as Source of Truth and KV as Optional Cache](adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md)
- [ADR-003: Begin with a Modular Monolith Cloudflare Worker](adr/ADR-003-MODULAR-MONOLITH-WORKER.md)
- [ADR-004: Adopt an Optional Tenant–Brand–Shop Hierarchy](adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md)
