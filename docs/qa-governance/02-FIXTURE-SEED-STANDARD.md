# Fixture／Seed Standard

Fixture 必須記錄 Fixture ID、Version、Owner Module、Schema Hash、Source Commit、Dataset Type、Synthetic Data Only、Deterministic Seed、Entity Count、Dependency Order、Setup Method、Cleanup Method、Retention、PII Classification、Security Classification。

## Rules

- 只使用 synthetic data；禁止真實會員、LINE UID、Email、Phone 與 Production Identifier。
- 使用固定 Seed 或可追溯的 deterministic generation；Fixture 必須版本化。
- Shared Fixture 與 Test-local Fixture 分離；測試不得污染後續案例。
- Fixture 變更建立新版本，不覆寫已被 Evidence 引用的版本。
- Cleanup 前必須證明 target 是指定 Test Environment、Run ID 與 Fixture Version。
- Cleanup target 不明或失敗時立即停止，不直接刪除未知資料。
- Retention 與 Security Classification 未核准前，不得分享 artifact。
