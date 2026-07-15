# Project Checklist

本清單適用於所有由 Platform Core Framework 延伸的新 Application。未使用的能力需標示「不適用」並說明原因，不可直接略過。

## 1. Framework 組合

- [ ] 已列出此 Application 使用的 Platform Core 能力與版本。
- [ ] 已列出啟用的 Domain Module、版本與 Feature Flag。
- [ ] 已列出使用的 Adapter 與外部 Provider。
- [ ] 已列出所有 Extension、Owner、適用 Tenant 與回滾方式。
- [ ] 已列出 Tenant Configuration、預設值、作用層級與變更權限。
- [ ] 已確認沒有客戶專屬 Platform Core 修改；正常答案必須為「否」。

## 2. Platform User 與 Identity Mapping

- [ ] 已定義 Platform User 如何建立、合併、停用與刪除。
- [ ] 已選定登入 Provider 及 Identity Mapping 的連結、解除與復原流程。
- [ ] 登入成功與 Tenant 授權成功已分開處理。
- [ ] 不以 LINE UID 或 `LINE UID + Shop ID` 作為 Platform User 或業務資料唯一主鍵。
- [ ] 身份異動具備 Audit Log。

## 3. Tenant Membership 與 Shop Membership

- [ ] 已定義 Tenant Membership 如何建立、停用與刪除。
- [ ] 如有多 Shop，已定義 Shop Membership 與 Tenant Permission 的差異。
- [ ] 所有資料、Cache、R2 物件、Queue 與 Domain Event 都能判定 Tenant Scope。
- [ ] 不同 Tenant 與 Shop 的資料及 Permission 已驗證隔離。

## 4. CRM 與 Member

- [ ] CRM Profile、標籤、互動與 Member 生命週期有明確 Owned Data。
- [ ] 通道身份不直接等同於 Tenant Membership。
- [ ] CRM Module 不直接讀取 Point、Referral 或其他 Module 的資料表。

## 5. Point

- [ ] Point 是否跨 Tenant？正常情況必須為「否」。
- [ ] 已採 Point Account／Transaction 概念並保留完整異動軌跡。
- [ ] 發放、扣除、到期、調整與 Idempotency 規則已定義。
- [ ] 餘額、Transaction、Cache 與 Permission 的 Tenant Scope 已驗證。

## 6. Referral 與 Attribution

- [ ] 推薦人屬於 Platform 還是 Tenant？原則上應屬 Tenant Relationship，例外需 ADR。
- [ ] 已定義推薦關係、分享識別、有效期間與重複／自我推薦處理。
- [ ] 已定義 Attribution 採首次、最後點擊或其他 Policy，並說明證據。
- [ ] Referral、Attribution、Point 與交易 Module 保持解耦。

## 7. Permission

- [ ] 角色、資源、操作與 Platform／Tenant／Shop Scope 已定義。
- [ ] API 執行 Permission 檢查，不只依賴前端隱藏。
- [ ] 跨 Tenant、跨 Shop 與 Platform 管理負面案例已測試。
- [ ] 最小權限、權限變更與 Audit Log 已定義。

## 8. Configuration、Policy、Strategy 與 Extension

- [ ] 參數及開關使用 Configuration，不硬編碼客戶名稱。
- [ ] 可替換演算法使用 Policy 或 Strategy，並具共同契約。
- [ ] 客戶特殊流程使用 Extension 與正式 Extension Points。
- [ ] 沒有 `if tenant_id === ...` 類型的 Platform Core 判斷。
- [ ] Extension 可由 Feature Flag 停用且不影響其他 Tenant。

## 9. Notification 與 Adapter

- [ ] 通知意圖與 LINE、WhatsApp、Email 等 Adapter 分離。
- [ ] 已定義同意、退訂、樣板、重試與發送結果。
- [ ] Adapter 不承載 Point、Referral、Member 或優惠規則。
- [ ] 通知內容不洩露其他 Tenant 或敏感資料。

## 10. API 與 Domain Module 協作

- [ ] API 已定義版本、驗證、Tenant Context 與 Permission Scope。
- [ ] 錯誤、分頁、Idempotency、追蹤與回滾格式一致。
- [ ] Domain Module 只透過公開 Interface、Command、Query、Domain Event 或 Queue 協作。
- [ ] 沒有直接查詢其他 Domain Module 資料表或 Import private function。
- [ ] 破壞性變更具 MAJOR 版本、ADR 與遷移計畫。

## 11. Data、Security 與 Privacy

- [ ] 已定義 Owned Data、一致性、保留、刪除與 Audit Log 政策。
- [ ] 已列出敏感資料、個資、Secret、Token 與最小存取範圍。
- [ ] 敏感資料不寫入 Repository、Log 或未隔離 Cache。
- [ ] Schema 只在資料與 Module Contract 核准後另案設計。

## 12. Cloudflare 與部署架構

- [ ] Workers、D1、KV、R2、Queues、Cron、Durable Objects、AI Gateway 與 Cache 均依責任選用。
- [ ] Development、Staging 與 Production 資源已隔離。
- [ ] 可以先採模組化單一 Worker，但未把所有責任寫在同一檔案。
- [ ] 拆分多 Worker 的安全、流量、週期或故障隔離理由已記錄。
- [ ] Binding、容量、成本、監控、重試與失敗策略已確認。

## 13. Quality、版本與營運

- [ ] 每個 Domain Module 可獨立測試並有版本鎖定。
- [ ] API Contract、Permission、Tenant Boundary 與跨 Tenant 負面案例已測試。
- [ ] 已建立 Feature Flag、Observability、Audit Log 與 Idempotency。
- [ ] 已建立模組與 Application 回滾計畫。
- [ ] 文件、測試、Interface、Domain Event 與實作同步。
- [ ] 超過檔案審查門檻時已有責任分析或重構計畫。

## 14. Release Gate

- [ ] 部署目標、帳號、Branch、Commit、依賴版本與環境已確認。
- [ ] Migration、Secret、Binding、Feature Flag 與回滾方案已準備。
- [ ] Staging 與真實入口驗收已完成。
- [ ] 所有必填項目完成，或有核准的例外及 ADR。
- [ ] 無未授權的 Platform Core 修改、客戶邏輯或跨 Tenant 風險。
- [ ] 「是否有客戶專屬 Core 修改」答案為「否」。
- [ ] 發布人、核准人、版本與驗證證據可追溯。
