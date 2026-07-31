# Provider／Model Catalog

本版只有 `deterministic_local_adapter` 可執行。`disabled_openai_adapter` 與 `disabled_generic_adapter` 永遠 fail closed，不讀 Secret、不發網路請求。

Catalog 保存能力、資料區域、retention policy、版本與狀態；若未來需要 Credential，只能保存 `secret:` reference，不能保存 Secret Value。
