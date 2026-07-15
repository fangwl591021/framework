# Reading Paths

> 依角色與可用時間選擇；正式 Decision 仍需閱讀原始 ADR／Contract

## Tony／Architecture Owner

```text
Architecture Handbook
→ Executive Overview
→ Decision Status Map
→ Open Decisions
→ relevant Accepted ADR
```

重點：是否準確、是否漏掉商業模型、Open Decision 是否需要 ADR／Owner／截止 Sprint。

## Engineer

```text
Architecture Handbook
→ Architecture Layers
→ Module Contract
→ Domain Model
→ Logical Data Model
→ Transaction Safety
→ Scenario Matrix
```

實作前再讀 [Development Standard](../03-DEVELOPMENT-STANDARD.md) 與 [Project Checklist](../09-PROJECT-CHECKLIST.md)。

## Codex

```text
AI Working Guide
→ relevant Accepted ADR
→ relevant Contract／Registry
→ Data Boundary
→ Project Checklist
→ Scenario Matrix
→ Read-only Audit／GO-NO-GO
```

## Business Partner

```text
Executive Overview
→ Platform Mental Model
→ Project Assembly Guide
→ Legacy Asset Map
```

## New Team Member

### 30-minute path

[主 Handbook](../../ARCHITECTURE-HANDBOOK.md) → [Executive Overview](01-EXECUTIVE-OVERVIEW.md) → [Mental Model](02-PLATFORM-MENTAL-MODEL.md) → [Glossary](15-GLOSSARY.md)。

### 2-hour path

30-minute path → [Layers](03-ARCHITECTURE-LAYERS.md) → [Identity／Membership](04-IDENTITY-TENANT-MEMBERSHIP.md) → [Module Map](05-MODULE-ENGINE-MAP.md) → [Transaction Safety](06-TRANSACTION-SAFETY.md) → [Decision Status](13-DECISION-STATUS-MAP.md)。

### Full technical path

2-hour path → [正式文件導航](00-HANDBOOK-GUIDE.md#正式文件導航) → 12 ADR → relevant Contract／Registry → Domain／Logical Model → Transaction／Scenario Matrix → Governance／Open Decisions。
