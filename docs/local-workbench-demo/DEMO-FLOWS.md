# Demo Flows

| Flow | Formal boundary | Evidence |
|---|---|---|
| 建立活動 | Workbench → Event adapter → traffic/module/permission/access fence → Event Service | confirmation、Event row、Audit、Idempotency |
| 報名統計／活動清單 | Event query gate | Local D1 query result |
| 我的佣金／績效 | Network self-only query | actor membership mapping |
| 模組清單／停用／啟用 | Platform invocation → Application Assembly | entitlement/enablement/audit |
| 今日診斷／Support Code | Diagnostics adapter | tenant-scoped diagnostic result |

Fixture reference `fixture:event` 只由 Server 解析；實際 ID 不回傳或渲染。