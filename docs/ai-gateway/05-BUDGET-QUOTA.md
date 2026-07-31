# Budget／Quota

Budget 支援 Platform、Tenant 與 Application 的獨立 window，限制 requests、input、output、estimated cost 與 concurrency。每次請求在 Cache／Shortcut 前，對所有適用層級以同一 D1 batch 條件式更新並建立 fenced lease；任一層拒絕就整批回滾。

Claim、Request 狀態與 Lease 位於同一 D1 batch；超額 fail closed。Lease release 以 fencing token 防止 stale owner。
