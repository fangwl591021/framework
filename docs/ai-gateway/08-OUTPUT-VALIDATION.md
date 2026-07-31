# Output Validation

所有輸出在回傳前驗證 JSON shape、長度、HTML／script、內部工具字樣、role／permission override。Intent 只能落在 Workbench allowlist；低 confidence 必須回 clarification，不得自行執行 Domain Mutation。
