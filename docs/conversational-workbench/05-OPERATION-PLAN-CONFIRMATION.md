# Operation Plan and Confirmation

Plan 固定 intent/module/operation、canonical parameter digest、bounded parameter snapshot、risk、confirmation policy、Context fence reference、idempotency key、version 與 expiry。參數變更會取消舊 Plan 並建立新 version；Plan identity 與 parameters 由 trigger 保護。

Event create/cancel 與 module enable/disable 要求 explicit confirmation。只有「確認／確定執行／confirm」與「取消／cancel」是明確決策；模糊文字不執行。Confirmation 綁定 Plan、Actor、Plan version、message key 與 expiry。Execution record 每 Plan／idempotency key 最多一筆且 immutable。
