# Dependency Rules

Dependency 類型：`required`、`optional`、`conflict`。

- Required 必須 available、entitled、enabled，且有效期間成立。
- Optional 不阻擋啟用。
- Conflict 在另一模組有效啟用時阻擋。

Required graph 以 bounded recursive query（最大 16 層）檢查 cycle；一次查回一個模組的最多 64 個 dependency state，不逐筆查詢。Event 與 Business Network 預設無互相依賴。
