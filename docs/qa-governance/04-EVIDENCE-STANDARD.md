# Evidence Standard

每份 Evidence Record 必須包含 Evidence ID、Test ID、Run ID、Environment、Repository、Commit SHA、Schema Hash、Migration Hash、Fixture ID／Version、Seed、Operator、Start／End Time、Exit Code、Command Reference、Sanitized Logs、Before／After State、Database Snapshot Reference、Query Plan、Screenshot Reference、Result、Reviewer、Review Date、Retention Class。

## Rules


## Evidence Preservation

- Screenshot 不能是唯一證據，只能作為補充。
- 不得覆寫 Failed Run；Retry 必須指向前一次 Run。
- Screenshot 只能補充，不能作唯一證據。
- Failed Run 不得覆寫；Retry 必須引用前一 Run。
- Evidence 不得包含 Secret、Token 或完整 PII，Log 必須 Sanitized。
- Evidence 缺失、hash 不符或 capture 失敗時不得標記 Passed。
- Artifact Reference／Evidence Hash 必須可追溯，存取權與 retention 需經核准。
- Planned Record 不得填入虛構 Actual Result、Log、Screenshot 或 Reviewer。
