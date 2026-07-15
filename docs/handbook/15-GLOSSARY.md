# Glossary

> 共通語言；精確語意仍以 Accepted ADR、Boundary 與 Contract 為準

| Term | 中文解釋 | 技術定義 | 容易混淆的詞 |
| --- | --- | --- | --- |
| Platform Core | 平台共用核心 | 跨專案、跨 Tenant、跨通道的底層能力與規範 | Domain Module、Application |
| Domain Module | 領域模組 | 擁有單一 Domain Data、Command、Query、Event 的可組合能力 | Extension、Platform Core |
| Adapter | 適配器 | 驗證、轉換並隔離外部 Channel／Provider | Extension、Domain Logic |
| Extension | 擴充流程 | 透過正式 Extension Point 承載客戶／產業特殊流程 | Module、Configuration |
| Application | 應用組裝層 | 選用 Module、Adapter、Extension 並協調 use case | Platform Core |
| Tenant | 租戶／組織根 | 必要的業務資料與 Permission 隔離邊界 | Brand、Shop |
| Brand | 品牌節點 | Tenant 下選用的品牌／事業單位 | Tenant |
| Shop | 門市／營運節點 | Tenant 下選用的據點 Scope | Tenant、Shop Membership |
| Platform User | 平台主體 | 跨 Provider 的自然人或服務主體 Reference | Login Identity、Member |
| Identity Mapping | 身份映射 | Provider Context＋Subject 與 Platform User 的已驗證連結 | Tenant Membership |
| Tenant Membership | 租戶會員關係 | Platform User 在單一 Tenant 的業務關係 | Platform User |
| Shop Membership | 門市參與關係 | Tenant Membership 與同 Tenant Shop 的關係 | Tenant Membership |
| Role | 角色 | 一組可授予 Permission 的治理概念 | 前端顯示名稱 |
| Permission | 權限 | Subject 對 Resource／Action／Scope 的能力 | Login、Role label |
| Policy | 政策 | 版本化的業務判斷規則 | Strategy、Configuration |
| Strategy | 策略 | 具共同 Contract 的可替換算法／流程 | Extension |
| Referral | 推薦關係 | Tenant 內 Membership 的長期直接介紹關係 | Attribution、Share |
| Attribution | 歸因 | 特定 Conversion 依 Evidence／Policy 的版本化決策 | Referral、Commission |
| Conversion | 轉換 | 可被歸因的穩定業務事實 Reference | Attribution Record |
| Share Link | 分享連結 | 連接 Promoter、Context 與安全 Token 的歸因入口 | Referral Invitation |
| Point Program | 點數方案 | Tenant 內定義 Point Kind、Scope 與版本化 Rule 的容器 | Point Account |
| Point Account | 點數帳戶 | Tenant Membership 在 Program／optional Shop Scope 的資產帳戶 | Balance Projection |
| Point Transaction | 點數交易 | 已成立並正式影響／抵消／調整資產的 Ledger Entry | Failed Point Intent |
| Ledger | 帳本 | 不覆寫已成立歷史、可追溯的交易 Source of Truth | Projection、Audit |
| Projection | 投影 | 可由 Source Records 重建的查詢加速結果 | Ledger、Cache |
| Attendance | 簽到結果 | Tenant 內 Subject／Session 與 Membership 的驗證事實 | Point Grant |
| Redemption | 核銷／兌換 | Merchant 驗證的 Intent、Result 與 Receipt | Point Ledger |
| Idempotency | 冪等 | 相同 Intent 重送只產生一個效果並回 Stored Result | Cache、Dedup log |
| Stored Result | 儲存結果 | Idempotency Record 中安全、可重播的 success／failure 摘要 | Domain Record、Full Payload |
| Audit | 稽核紀錄 | 最小必要 Actor／Decision／Change Evidence | Domain Transaction、Debug Log |
| Reverse | 反轉 | 對已成立交易建立反向 Record 抵消效果 | Delete、Correct |
| Correct | 修正 | 保留原結果並建立新的正式版本 | Update、Reverse |
| Adjust | 調整 | 授權處理一般交易無法表達的差額 | Grant／Deduct |
| Logical Schema | 邏輯資料模型 | Record、Ownership、Scope、Constraint 的語意設計 | Physical Schema |
| Physical Schema | 實體結構設計 | 實際 Table、Column、Type、Constraint、Index | Logical Model、Runtime |
| Migration | 遷移 | 受控地改變 Schema／Data 並具驗證與復原策略 | Deployment |
| Reconciliation | 對帳／協調 | 比較 Source、Result、Projection 或跨 Module 狀態並處理 drift | Blind Retry |
| Business Reference | 業務參照 | 跨 Module 穩定識別某一 Intent／Fact 的 Reference | Provider UID、Timestamp |

**Glossary count: 38.** 相關正式詞彙來源：[Core Domain Model](../23-CORE-DOMAIN-MODEL.md)、[Module Contract Standard](../19-MODULE-CONTRACT-STANDARD.md)、[Transaction Safety](../39-TRANSACTION-SAFETY-STANDARD.md)。
