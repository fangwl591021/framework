# Platform Blueprint

## 高層架構

Platform Core Framework 使用五層架構。穩定依賴由 Application 朝 Platform Core 前進；外部平台透過 Adapter 接入；Tenant 或產業差異留在 Configuration、Policy、Strategy 或 Extension。

```text
Application / Tenant Configuration
                ↓
             Extension
                ↓
          Domain Modules
                ↓
          Platform Core
                ↑
             Adapters
                ↑
     LINE / WhatsApp / Google / AI / OCR
```

完整規則見 [Framework Layers](10-FRAMEWORK-LAYERS.md) 與 [Version and Dependency Rules](12-VERSION-DEPENDENCY-RULES.md)。

## Architecture Governance

- Architecture Owner 為 Tony，最終批准 Platform Core Boundary、Module Promotion、Breaking Change 與 ADR Acceptance。
- 每個正式 Domain Module 必須有 Module Owner、Module Contract 與 Module Registry Entry。
- AI、Codex 與 Implementer 不得自行批准 Stable、Core Approved 或重大 ADR。
- `Decision Accepted`、`Implementation Completed` 與 `Production Verified` 分別記錄。

治理權責見 [Architecture Ownership](18-ARCHITECTURE-OWNERSHIP.md)。

## 五層責任

### Platform Core

提供 Identity、Tenant、Permission、Setting、Audit Log、Feature Flag、Domain Event、Idempotency、Common Error Model、Module Registry 與 Observability 等跨專案底層能力或規範。Audit Log、Feature Flag、Idempotency、Module Registry 目前僅為 `Candidate`，未 Implemented 或 Core Approved。

### Domain Module

提供 CRM、Member、Point、Referral、Attribution、Event、OCR、Document、Notification 等可獨立組合的領域能力。每個 Domain Module 擁有自己的 Owned Data 與 Public Interface，並遵循 [Module Contract Standard](19-MODULE-CONTRACT-STANDARD.md)。

### Adapter

處理 LINE、WhatsApp、WeChat、Login Provider、AI、OCR、Storage 等外部格式與 Provider 差異，不承載核心商業規則。

### Extension

承載特定客戶或產業特殊流程，只透過 Hook、Domain Event、Policy、Strategy、Plugin Interface 或 Configuration 擴充。

### Application／Tenant Configuration

Application 組合能力；Tenant Configuration 表達 Module 開關、規則參數、語系、品牌與通道設定，避免為 Tenant 差異修改 Framework。

## Organization Hierarchy

```text
Tenant
├── Brand
│   └── Shop
└── Shop
```

- Tenant 必要，是主要資料與 Permission 隔離層。
- Brand 選用，代表品牌、產品線或事業單位。
- Shop 選用，代表門市、據點或營運單位。
- 單店可用 `Tenant → Shop`；無店組織可只有 Tenant。
- Point 是否跨 Shop，由 Tenant Policy 明確決定；不同 Tenant 預設不共享 Point、Referral 或 CRM。

詳見 [Organization Hierarchy](22-ORGANIZATION-HIERARCHY.md) 與 [ADR-004](adr/ADR-004-TENANT-BRAND-SHOP-HIERARCHY.md)。

## Identity and Membership

- **Platform User**：自然人或平台主體，不直接保存 Tenant 業務資料。
- **Identity Mapping**：連結 LINE、Google、Apple、Facebook、WhatsApp、Email、Mobile 等 Provider Identity。
- **Tenant Membership**：Platform User 在單一 Tenant 的會員關係，擁有該 Tenant 的 Point、Referral、CRM 與 Permission 資料。
- **Shop Membership**：Tenant 內特定 Shop 的參與關係，不取代 Tenant Membership。

此分離已由 [ADR-001](adr/ADR-001-PLATFORM-USER-TENANT-MEMBERSHIP.md) 接受。

## Data Source Decision

D1 作為 Membership、Point、Attendance、Referral、Attribution、Order、Redemption、Approval 與需要一致性 Configuration 的 Source of Truth。KV 只作選用 Cache；不一致時以 D1 為準。詳見 [ADR-002](adr/ADR-002-D1-SOURCE-OF-TRUTH-KV-CACHE.md)。

## Worker Architecture

Framework 初期採 `Modular Monolith Worker`：可以是一個或少量部署單位，但程式必須依 Platform Core、Domain Module、Adapter、Extension、Application Composition 分離。主入口只負責啟動、Route 掛載與 Dependency Composition。

安全、資料權限、流量、部署週期、故障隔離、Cloudflare 限制、團隊責任或 Queue／Cron Workload 出現實質差異時，再以新 ADR 評估多 Worker。詳見 [ADR-003](adr/ADR-003-MODULAR-MONOLITH-WORKER.md)。

## 通道與 Tenant 原則

- Domain Module 不以 LINE UID、LIFF 或特定訊息格式作核心契約。
- Adapter 把外部事件轉成平台 Command／Query，並轉換回應格式。
- Platform User 可跨 Tenant 共用身份，Tenant Membership 與 Domain Data 必須隔離。
- Query、Cache、R2、Queue 與 Domain Event 都需保留 Tenant Scope。
- 跨 Tenant 操作必須有明確 Platform Permission 與 Audit Log。

## Module Registry Candidate

[Module Registry](20-MODULE-REGISTRY-STANDARD.md) 將記錄 Domain Module Lifecycle、版本、Owner、依賴、Adapter、Feature Flag 與相容範圍。它目前僅為 Candidate，不執行商業邏輯、不保存 Tenant 資料，也不代表 Module 已部署。
