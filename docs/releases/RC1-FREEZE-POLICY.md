# RC1 Freeze Policy

## 受保護的架構基準

RC1 凍結以下已核准邊界：

- 12 份 Accepted ADR。
- Platform User、Identity Mapping、Tenant Membership 的責任分離。
- Referral Relationship 與 Attribution Decision 的責任分離。
- 正式 Point Ledger Effect 與 Failed Intent 的資料分離。
- Single-layer Referral 預設政策。
- D1 作為 Source of Truth，KV 僅為可選 Cache。
- Gate 1 Cross-Tenant Foreign Key、Gate 2 Active-only Uniqueness、Gate 3 Point Ledger Concurrency 的通過結論與必要條件。

## 變更要求

任何改變上述邊界的提案都必須包含：

1. 新 ADR，不直接修改既有 Accepted ADR 的歷史結論。
2. 受影響元件、Tenant Boundary 與安全影響分析。
3. Migration、Rollback、Forward Fix 與 Reconciliation 影響。
4. 向後相容與版本升級策略。
5. Architecture Owner 明確核准。

## 不需解除 Freeze 的變更

錯字、Markdown Link、文件導航、無語意變更的排版，以及不改變既有邊界的 Security／Privacy 補充，可透過一般文件審查處理。

## Release Control

RC1 文件被合併不等於建立 Git tag 或 GitHub Release。Tag／Release 必須另案取得核准。
