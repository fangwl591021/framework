# Intent Registry

Migration 0007 註冊 12 個 version 1 intent：Event 4 個、Business Network 3 個、Application Assembly 3 個、Diagnostics 2 個。Registry row immutable；更動必須新增 version，不得覆寫歷史。

`DeterministicIntentResolver` 支援 exact、normalized synonym 與中英文 alias；ambiguous 必須澄清，unsupported 必須回應，injection 必須拒絕。`DisabledAiIntentResolver` 永遠不執行；未來 AI 結果仍必須命中 Registry 與 Router allowlist。
