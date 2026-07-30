# ADR-015: Enforce Trusted Tenant Context and a Separate Internal Administration Boundary

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
- 相關範圍：Tenant Access、Authorization、Internal Administration

## 背景與問題

Tenant Route、Credential 與 Resource 可能提供不同 Scope。若 Header 或 URL 被當成完整授權，可能跨 Tenant 存取；若公開 Bootstrap，第一個使用者可能取得平台權限。

## 候選方案

1. 信任 Client Tenant Header。
2. 只信任 Route。
3. Route 定義 Resource Scope，並與 Credential、Role Assignment、Resource Tenant 交叉驗證。

## 方案比較

| 方案 | 優點 | 缺點／風險 | 可回滾性 |
| --- | --- | --- | --- |
| Header | 實作快速 | 可偽造、易跨 Tenant | 低 |
| Route only | 清楚 | 仍未證明 Actor authority | 低 |
| Cross-check | 邊界可驗證 | 實作與測試較多 | 高 |

## Proposed Decision

Tenant Route `tenantId` 定義 Resource Scope，但必須與 Credential、Role Assignment 及 Resource Tenant 相符。Header 不得建立可信 Tenant Context。Repository 所有 tenant-scoped 方法都要求 `tenantId`。

Platform Administration 使用獨立 Internal Administration Boundary。不得建立公開 Bootstrap API、不得讓第一位註冊者自動成為管理員；未來以一次性、可稽核且另經 Security／Execution Gate 的 Administration Command 建立 Service Principal／Platform Administrator。

## 影響與風險

- 可用一致負向測試證明 Tenant isolation。
- 需要清楚區隔 Platform 與 Tenant APIs。
- Service Principal credential mechanism 尚未決定。

## 後續工作

- [ ] Tony 核准本 ADR。
- [ ] Runtime PR 定義 trusted request context port。
- [ ] Security Design 定義 Service Principal 與 bootstrap ceremony。

## 重新檢討條件

- 未來採用具等價 tenant-bound claims 與 policy enforcement 的可信 gateway。

## 相關文件

- [Tenant Data Boundary](../15-TENANT-DATA-BOUNDARY.md)
- [Tenant Access Contract](../runtime-phase-1/02-TENANT-ACCESS-CONTRACT.md)
- [Authorization Contract](../runtime-phase-1/03-AUTHORIZATION-CONTRACT.md)
