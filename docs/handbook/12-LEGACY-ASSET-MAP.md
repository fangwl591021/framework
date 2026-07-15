# Legacy Asset Map

> Candidate Source ≠ Approved Implementation ≠ Code Copy Source

| 能力 | 來源 | 候選定位 |
| --- | --- | --- |
| CRM | Action | CRM Module Candidate |
| 商城 | Hooktea | Commerce Module Candidate |
| Rich Menu | 好櫻花福委會 | LINE Adapter／Content Candidate |
| 電子名片 | 小系統 V0–V5 | Business Card Module Candidate |
| 名片 OCR | LINE 專案 | OCR Workflow Candidate |
| 旅遊文件解析 | TravelKeeper | Document／Travel Extension |
| 活動管理 | TDA | Event Module Candidate |
| 活動簽到 | K-Link | Attendance／Location Policy |
| Flex 推薦 | TravelKeeper | Content Collection Candidate |
| Referral／Attribution | TravelKeeper | Module Candidate |

以上只記錄已知來源與初步分類，沒有讀取、複製或驗證來源程式，也沒有完成跨專案整合。正式盤點見 [Feature Asset Map](../02-FEATURE-ASSET-MAP.md)。

## 萃取規則

```text
Inventory
→ Read-only Audit
→ Current Behavior
→ Contract Comparison
→ Gap Analysis
→ Customer-specific Separation
→ Public Interface／Owned Data
→ Security／Test Plan
→ Experimental
→ Cross-project Validation
→ Stable Review
```

每個來源必須確認 Repository、Branch、Commit、Runtime Surface、Permission、Tenant Boundary、PII、Secret、Owned Data 與 Provider dependency。保留的是有 provenance 的設計證據，不是來源 Code、Schema、Secret 或 Production Data。詳見 [Legacy Asset Extraction](../17-LEGACY-ASSET-EXTRACTION.md)。
