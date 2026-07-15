# Executive Overview

> 非技術摘要 · Candidate Source 不等於已整合

## 為什麼需要 Framework

每個專案各自開發，會重複處理登入、會員、權限、點數、推薦、資料隔離與維運；相似功能逐漸產生不同名詞、不同資料真相與不同安全規則。Platform Core 用共同 Decision、Boundary 與 Contract 統一基礎，讓 Application 以組裝與設定開始，而不是複製舊專案。

Framework 不綁死 LINE。LINE、WhatsApp、Web 或 App 都只是 Channel；Provider 身份先經 Identity Mapping，再解析 Platform User 與 Tenant Membership。正式原則見 [Vision](../00-VISION.md) 與 [ADR-008](../adr/ADR-008-EXTERNAL-IDENTITY-NOT-BUSINESS-KEY.md)。

## 必須分離的概念

- **身份與會員**：一個人可以加入多個 Tenant；各 Tenant 的點數、CRM、角色與介紹人獨立。
- **Referral 與 Attribution**：長期介紹關係不等於某筆交易由哪次分享促成；見 [ADR-005](../adr/ADR-005-REFERRAL-AND-ATTRIBUTION-SEPARATION.md)。
- **Attribution 與 Commission**：歸因只決定證據與歸屬，不直接付款或發點。
- **Point Intent 與 Ledger**：Ledger 只保存已成立資產異動；餘額不足等失敗保存 Stored Result，不建立 Point Transaction。

Multi-Tenant 是核心，因為同一自然人在不同商家或組織的權益不能互相污染。Referral 預設 Single-Layer，避免 Core 預埋多層分潤與循環風險；見 [ADR-007](../adr/ADR-007-SINGLE-LAYER-REFERRAL-DEFAULT.md)。

## 為什麼先寫文件

文件先行不是延後開發，而是先確認誰擁有資料、誰可以下 Command、失敗如何重送、完成交易如何修正，以及哪些內容尚未批准。Accepted Decision 仍不代表程式已完成；目前 Framework 只有 Documentation／Logical Design，沒有 Runtime 或正式 Schema。

## Tony 的應用情境

| 情境 | 可能使用的 Framework 能力 | 現況 |
| --- | --- | --- |
| K-Link | Identity、Membership、Attendance、Point、Redemption、LINE Adapter | Candidate Assembly；未整合 |
| TravelKeeper | Identity、Referral、Attribution、Content、Document、OCR、Notification | Candidate Assembly；未整合 |
| BookingOS | Identity、Tenant、Permission、Booking／Staff／Service、Notification | Candidate Assembly；未整合 |
| 電子名片 | Identity、Business Card、OCR、Content | Candidate Source；未萃取 |
| CRM | Membership、Permission、CRM | Candidate Source；未萃取 |
| 活動報名 | Event、Membership、Notification | Candidate Assembly；未實作 |
| 商城 | Commerce、Membership、Point／Attribution optional | Candidate Source；未萃取 |
| LINE Rich Menu | LINE Adapter、Content、Tenant Configuration | Candidate Source；未萃取 |
| OCR | OCR Adapter／Module、Document／Business Card Extension | Candidate Source；未萃取 |

來源定位見 [Feature Asset Map](../02-FEATURE-ASSET-MAP.md)；它們不是 Approved Implementation 或 Code Copy Source。
