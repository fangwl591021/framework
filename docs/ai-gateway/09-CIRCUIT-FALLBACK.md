# Circuit／Fallback

AI Gateway 使用既有 Traffic Protection 的 admission 結果，不自行建立第二套 Rate Limit 或 Circuit State。Provider failure 可依受治理 route chain fallback，最多兩 hop；全數失敗回安全錯誤。

本版不包含 Durable Object、Queue、Cron 或 Remote coordination adapter。
