# AI Task Registry

正式 Task：`workbench.intent_resolution`、`workbench.clarification_suggestion`、`diagnostics.safe_summary`、`content.safe_rewrite`、`content.translation`。每個 Task 固定版本、分類、敏感度、品質、快取策略、能力與 input／output 上限。

Runtime 不可動態註冊 Task；新增或改變 Contract 必須經 Architecture Review 與正式 Migration。
