# Project Checklist

本清單適用於未來所有由 Platform Core 延伸的新 SaaS 專案。未使用的能力需標示「不適用」並說明原因，不可直接略過。

## 1. 專案邊界

- [ ] 已定義產品目的、使用者角色與非目標。
- [ ] 已區分 Core、Module、Adapter、Extension 與 Project 責任。
- [ ] 未將客戶專屬邏輯寫入 Platform Core。
- [ ] 已定義驗收情境與完成標準。

## 2. Identity

- [ ] 已定義 Platform User、Tenant Member 與 Shop Member 的使用方式。
- [ ] 已選定登入提供者及帳號連結、解除與復原流程。
- [ ] 登入成功與授權成功已分開處理。
- [ ] 身份異動具備稽核紀錄。

## 3. Tenant

- [ ] 所有資料與操作都能判定 Tenant Scope。
- [ ] Tenant 生命週期、狀態與設定來源已定義。
- [ ] 不同 Tenant 的資料、快取、檔案與事件已隔離。

## 4. CRM 與 Member

- [ ] 已定義 Member 的資料擁有者與生命週期。
- [ ] CRM 互動、標籤與來源具清楚契約。
- [ ] 通路身份不直接等同於 Member。

## 5. Point

- [ ] 若使用點數，已採帳本概念並保留完整異動軌跡。
- [ ] 發放、扣除、到期、調整與冪等規則已定義。
- [ ] 餘額與交易的 Tenant Scope 已驗證。

## 6. Referral

- [ ] 已定義推薦關係、分享識別與有效期間。
- [ ] 推薦事件與獎勵或點數計算保持解耦。
- [ ] 已處理重複、自我推薦與濫用情境。

## 7. Permission

- [ ] 角色、資源、動作與範圍已明確定義。
- [ ] API 端執行授權，不只依賴前端隱藏功能。
- [ ] 跨 Tenant、跨 Shop 與平台管理權限已測試。

## 8. Notification

- [ ] 通知意圖與通路 Adapter 已分離。
- [ ] 已定義同意、退訂、樣板、重試與發送結果。
- [ ] 通知內容不洩露其他 Tenant 或敏感資料。

## 9. API

- [ ] 所有 API 已定義版本、驗證、Tenant Context 與 Permission Scope。
- [ ] 錯誤、分頁、冪等與追蹤格式一致。
- [ ] API 可被多通路重用，不綁定單一頁面。
- [ ] 破壞性變更具版本與遷移計畫。

## 10. Data

- [ ] 已定義資料擁有者、一致性、保留、刪除與稽核政策。
- [ ] 個資、Secret 與 Token 不寫入 Repository 或日誌。
- [ ] Database Schema 依已核准的領域模型另案設計。

## 11. Cloudflare

- [ ] Workers、D1、KV、R2、Queues、Cron、Durable Objects、AI Gateway 與 Cache 均依責任選用。
- [ ] Development、Staging 與 Production 資源已隔離。
- [ ] 綁定、容量、成本、監控、重試與失敗策略已確認。
- [ ] 未建立超大型單一 Worker。

## 12. Quality

- [ ] 每個 Module 與 Engine 可獨立測試。
- [ ] API 契約、權限與跨 Tenant 負面案例已測試。
- [ ] 文件、測試與實作保持同步。
- [ ] 已完成安全、隱私、效能與可觀測性檢查。

## 13. Deploy

- [ ] 部署目標、帳號、Branch、Commit 與環境已再次確認。
- [ ] Migration、Secret、Binding 與回復方案已準備。
- [ ] Staging 驗收與正式環境核准已完成。
- [ ] 部署後已驗證真實入口、關鍵流程、監控與版本來源。

## Release Gate

- [ ] 所有必填項目已完成，或有核准的例外紀錄。
- [ ] 無未授權的 Core 修改、客戶邏輯或跨租戶風險。
- [ ] 發布人、核准人、版本與驗證證據可追溯。
