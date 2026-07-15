# Core Cross-cutting Candidates

## 狀態聲明

Audit Log、Feature Flag、Idempotency 與 Module Registry 已由 Architecture Owner Tony 批准列為 `Platform Core Candidate`。四者目前均為：

```text
Lifecycle Status: Candidate
Implementation Status: Not Implemented
Production Verification: Not Verified
Core Approval: Not Approved
```

## Audit Log Candidate

- **Candidate Purpose**：提供敏感與重要操作的可追溯治理能力。
- **Proposed Responsibility**：記錄 Actor、時間、Tenant、Module、Action、Resource、Result 與 Correlation ID。
- **Forbidden Responsibility**：不得記錄 Token、Secret、密碼、未遮罩完整 PII；不得取代一般 Debug Log 或保存 Business Transaction 本體。
- **Tenant Scope**：每筆紀錄必須具明確 Tenant Scope；Platform 操作需明確標示 Platform Scope。
- **Security Concern**：不可竄改性、最小存取、保留期限、PII 遮罩與跨 Tenant 查詢。
- **Open Question**：保留期限、儲存服務、不可竄改證據與高敏感事件分類尚待 ADR。
- **Promotion Requirements**：Contract、Security Review、PII Policy、查詢權限、Retention、兩個實質差異場景與 Tony 批准。

### Log 類型差異

| 類型 | 目的 | 是否為交易真相 |
| --- | --- | --- |
| Audit Log | 誰在何時對何資源執行重要操作 | 否 |
| Application Log | 診斷 Application 執行狀況 | 否 |
| Security Log | 登入、拒絕、攻擊與安全事件 | 否 |
| Business Transaction Record | 訂單、Point、核銷等領域事實 | 是，由對應 Domain Module 擁有 |

## Feature Flag Candidate

- **Candidate Purpose**：安全控制功能曝光與漸進發布。
- **Proposed Responsibility**：Tenant／Module 開關、Experimental 限定啟用、分批發布與緊急停用。
- **Forbidden Responsibility**：不得永久取代 Configuration、產生無 Owner 旗標，或隱藏未完成的 Security 問題。
- **Tenant Scope**：旗標必須定義 Platform、Application、Tenant、Brand、Shop 或使用者群組 Scope。
- **Security Concern**：管理權限、預設安全狀態、Cache 延遲、失效與越權啟用。
- **Open Question**：評估順序、Provider、快取與緊急操作權限尚待 ADR。
- **Promotion Requirements**：每個旗標具 Owner、Default State、Scope、Expiration、Removal Plan、Audit Log 與回滾測試。

## Idempotency Candidate

- **Candidate Purpose**：避免重送與重試造成重複狀態變更或交易。
- **Proposed Responsibility**：保護 Webhook、Point、Order、Attendance、外部 API 等 Command。
- **Forbidden Responsibility**：不得當成一般 Cache、資料庫唯一來源或隱藏不一致性。
- **Tenant Scope**：Idempotency Key 必須包含 Tenant 與操作 Scope，避免跨 Tenant 衝突或結果洩露。
- **Security Concern**：Key 猜測、結果重播、PII、過期、衝突與高併發一致性。
- **Open Question**：儲存服務、Expiration、Stored Result 大小與衝突回應尚待 ADR。
- **Promotion Requirements**：定義 Idempotency Key、Scope、Expiration、Stored Result、Conflict Behavior、Retry Behavior 與交易一致性測試。

Idempotency 是交易安全能力，不等同於單純 Cache。

## Module Registry Candidate

- **Candidate Purpose**：提供 Module Lifecycle、版本、Owner、依賴與相容性的治理索引。
- **Proposed Responsibility**：依 [Module Registry Standard](20-MODULE-REGISTRY-STANDARD.md) 保存治理 metadata。
- **Forbidden Responsibility**：不得執行商業邏輯、部署 Module、保存 Secret 或 Tenant 資料。
- **Tenant Scope**：Registry metadata 原則上是 Framework Scope；不得存入 Tenant Runtime State。
- **Security Concern**：避免洩露內部環境、未公開漏洞、Secret 或客戶資料。
- **Open Question**：Registry 文件組織、驗證工具與版本發布方式尚待決定。
- **Promotion Requirements**：metadata Contract、Lifecycle 一致性檢查、Owner 流程、兩個實質差異場景與 Tony 批准。

## Sprint 5 Application to Transactional Engines

| Candidate | Point | Referral | Attribution | Attendance | Redemption |
| --- | --- | --- | --- | --- | --- |
| Idempotency | Grant／Deduct／Reverse | Candidate／Confirm／Correct | Touch／Conversion／Evaluate | Attempt／Confirm | Intent／Complete／Reverse |
| Audit Log | Adjust／Reverse／Freeze | Confirm／Replace／Revoke | Decision／Correct／Reverse | Confirm／Correct／Revoke | Merchant decision／Complete／Reverse |

Idempotency 與 Audit Log 仍為 Platform Core Candidate，Not Implemented、Not Verified。各 Engine Contract 只能定義要求與 Boundary，不得假設已有共同 Runtime、D1 Table、KV Key 或 Durable Object。
