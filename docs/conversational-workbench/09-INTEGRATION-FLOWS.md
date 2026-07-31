# Integration Flows

## Event

Create 收集名稱／時間／名額、顯示摘要、確認後經 Event Gateway 呼叫 `createEvent` 與 `addSession`；兩者使用固定 idempotency key。Registration summary 只回 confirmed／waitlisted／cancelled／checked-in aggregate。Cancel 要求確認。

## Business Network

Commission、Performance、Referrals 只使用 current Actor membership；caller 無法提供 Partner ID。期間具明確 30 天安全預設；Referrals 最多 50 筆且不回 Buyer／Visitor／Partner internal reference。

## Application Assembly

List 顯示目前 active Application 的 enabled/entitled modules。Enable/disable 需要 `module_enablement:manage`、Traffic admission 與 explicit confirmation；未授權模組由既有 Assembly Service fail closed。Disable 保留資料。

## Diagnostics

Tenant summary 與 Support Code lookup 使用既有 Diagnostics Application Service。Tenant scope 與 code expiry 由正式服務保證；Workbench 只回 safe status/severity/reason/time，不回 correlationId、traceId、Stack 或 SQL。
