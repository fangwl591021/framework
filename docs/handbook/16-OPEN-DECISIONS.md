# Open Decisions

> 本文件只集中未決問題，不替 Tony 定案；Current Status 均不是 Accepted

| Decision | Why It Matters | Current Status | Options | Blocking Sprint | Owner | ADR Required |
| --- | --- | --- | --- | --- | --- | --- |
| Internal ID Generator | Collision、暴露、索引與分散建立 | UUIDv7 selected in ADR-013；Proposed／Pending Tony Approval | UUIDv7 | Runtime Phase 1 Decision Closure | Architecture Owner／Platform Architect | [ADR-013](../adr/ADR-013-UUIDV7-CORE-ENTITY-IDS.md) |
| Physical Time Storage | 排序、精度、時區與 migration | Open；Logical Model only on main | Integer epoch／canonical UTC text | Approved Migration Package | Platform Architect | Possibly |
| Active-only Uniqueness | Membership、Account、Referral、Attribution 單一有效紀錄 | Resolved by Gate 2；RC1 Frozen | status-based Partial Unique Index／canonical scope key | D1 Verification | Platform Architect／Domain Owners | New ADR only if boundary changes |
| Point Projection Atomicity | Balance read-after-write、drift、hot account | Resolved by Gate 3；D1 Evidence Pending | synchronous authoritative projection guard in same local transaction | Approved Migration Package | Point Owner／Platform Architect | New ADR only if boundary changes |
| Partial Reverse | 資產、Receipt 與 reconciliation 語意 | Deferred；RC1 supports Single Full Reverse only | future bounded partial／separate compensation | Future Point／Redemption ADR | Architecture Owner／Finance Owner | Yes |
| Shared／Dedicated D1 | Isolation、容量、成本與 tenant mobility | Open | Shared／tenant group／large-tenant dedicated | Runtime Foundation | Architecture Owner／Platform Architect | Yes |
| Audit Retention | 法規、incident、storage、legal hold | Open | Risk-tiered periods／archive | Audit Candidate Design | Security／Privacy Owner | Yes |
| Idempotency Retention | Replay／dispute window 與 storage growth | Open | Operation risk tiers／archive | Idempotency Candidate Design | Domain／Security Owners | Possibly |
| Attribution Touch Archive | 高寫入、privacy、window evidence | Open | Delete after policy／anonymize／archive | Attribution Experimental | Attribution／Privacy Owner | Possibly |
| Feature Flag Provider | Evaluation order、cache、emergency control | Open | D1／KV-backed／external provider candidate | Runtime Foundation | Platform Architect | Yes |
| High-risk Merge SLA | Duplicate Identity incident 與人工審查時效 | Open | Risk-tiered SLA／manual queue | Identity Runtime | Identity／Security Owner | Possibly |
| Location Evidence Retention | Privacy、attendance dispute、storage | Open | Minimal summary／short retention／restricted archive | Attendance Experimental | Privacy／Attendance Owner | Possibly |
| Identity Digest Canonical Encoding | 不同 Adapter 正規化與 key rotation continuity | HMAC-SHA-256 selected；encoding still Open | Versioned binary／length-prefixed canonical input | Identity Security Gate | Identity／Security Owner | [ADR-014](../adr/ADR-014-EXTERNAL-IDENTITY-SUBJECT-DIGEST.md) |
| Service Principal Credential | Internal Administration authentication and bootstrap | Open；public bootstrap prohibited | One-time offline command／controlled operator credential | Administration Security Gate | Security／Architecture Owner | [ADR-015](../adr/ADR-015-TENANT-CONTEXT-INTERNAL-ADMIN.md) |

上述 `Blocking Sprint` 只表示最晚需要決策的候選階段，不代表該 Sprint 已批准。部分問題來自 [Schema Readiness Gate](../51-SCHEMA-IMPLEMENTATION-READINESS-CHECKLIST.md)、[Core Candidates](../21-CORE-CROSSCUTTING-CANDIDATES.md) 與五個 Candidate Contracts。

## RC1 Clarification

Gate 2 已選定 status-based Partial Unique Index 與 canonical scope key；Gate 3 已選定同步 Authoritative Projection Guard、generation fencing 與 Single Full Reverse。這些架構邊界在 RC1 Freeze 下不再是方案選擇題，但其 D1 實測、效能與 Runtime 行為仍未驗證。

Approved Migration Package 開始測試前，UUIDv7 decision 必須獲 Tony 核准；Physical Time Storage、Audit／Idempotency Retention、Attribution Touch Archive 與 D1 Topology 仍是阻塞或明確限制。最新限制見 [RC1 Known Limitations](../releases/RC1-KNOWN-LIMITATIONS.md)，執行決策見 [Go／No-Go Decision](../migration-package/11-GO-NOGO-DECISION.md)。
