# Security／Isolation Test Standard

至少涵蓋 Cross-Tenant FK／Query、Role／Shop Scope、Token Tampering、Replay、Expired Credential、Revoked Membership／Staff、PII Exposure、Secret Leakage、Audit Export、Evidence Artifact Access、Cleanup Target Confusion、Production Identifier Detection。

每個案例需定義 Threat、Actor、Precondition、Attack／Misuse、Expected Denial、Expected Audit、Evidence、Severity、Escalation。

## Mandatory Stop Conditions

發現 Production Identifier、真實 PII、Secret／Token、未知 database target、commit／schema／migration hash mismatch、unexpected object、cleanup target 不明、evidence capture 失敗或權限超出需求時立即停止。

未取得 Security Approval 前，Test Artifact 不得外傳；Isolated Environment 必須證明沒有正式流量入口。Permission Denied evidence 不得洩漏其他 Tenant 的存在性。
