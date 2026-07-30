# ADR-014: Protect External Identity Subjects with Versioned HMAC Digests

## 基本資料

- 狀態：Proposed
- 日期：2026-07-30
- 決策人：Tony decision selected；PR approval pending
- Architecture Owner Approval：Pending
- Approval Date：N/A
- Implementation Status：Not Implemented
- Verification Status：Not Verified
- Supersedes：None
- Superseded By：None
- 相關範圍：Identity Core、Security

## 背景與問題

ADR-008 禁止 External Identity 成為 Business Key，但仍需定義 Mapping 如何避免保存 LINE／Google／Apple 等原始 Subject，同時支援 Provider Context 與 Key Rotation。

## 限制條件

- 原始 Subject、Token 與 Secret 不得進入 Domain、Audit、Stored Result 或一般 Log。
- 相同 Subject 在不同 Provider／Issuer Context 不得碰撞。
- Rotation 不得建立第二個 Platform User。
- 本 ADR 不建立 Secret、Adapter 或 Schema。

## 候選方案

1. 保存原始 Subject。
2. 無 key 的一般 hash。
3. HMAC-SHA-256＋版本化 key。
4. 可逆加密。

## 方案比較

| 方案 | 優點 | 缺點／風險 | 可回滾性 |
| --- | --- | --- | --- |
| Raw | 查詢直接 | 高敏感識別外洩 | 低 |
| Plain hash | 不保存明文 | 可被字典猜測、缺乏 key rotation | 低 |
| Versioned HMAC | 不可逆、Context-bound、可輪替 | Rotation 需雙版本解析流程 | 中 |
| Encryption | 可恢復原值 | Key compromise 可解密全部資料 | 中 |

## Proposed Decision

Identity Core 使用 HMAC-SHA-256 建立 `subject_digest`。輸入是 Provider、Issuer／Context 與 Subject 的版本化無歧義編碼，Mapping 保存 `digest_key_version`。正式 Mapping 狀態只有 `active`、`revoked`、`conflict`；只有已驗證 Credential 或受控 Internal Administration Command 能建立 active Mapping。

Rotation 必須在建立新 Platform User 前，以 active 與允許的 previous key versions 解析既有 Mapping；因此不能只依賴單一 `provider + context + digest + key_version` Unique Constraint維持身份延續。

## 影響與風險

- 降低原始 Provider Subject 外洩風險。
- Rotation、recovery 與 canonical encoding 更複雜。
- 若不同 Adapter 正規化不一致，仍可能產生重複 Mapping。

## 後續工作

- [ ] Tony 核准本 ADR。
- [ ] Security Gate 核准 canonical encoding、Secret provider、rotation operator 與 recovery。
- [ ] Runtime Contract tests 驗證 rotation continuity 與 no-raw-subject leakage。

## 重新檢討條件

- Provider 強制需要可逆 Subject。
- Security Review 證明 HMAC boundary 無法滿足 recovery 或法規。

## 相關文件

- [ADR-008](ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md)
- [Identity Core Contract](../runtime-phase-1/01-IDENTITY-CORE-CONTRACT.md)
