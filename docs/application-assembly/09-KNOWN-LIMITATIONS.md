# Known Limitations

- 無 Billing、Payment、Marketplace UI 或 Admin UI。
- 無 Remote D1、Production binding、deployment 或 scheduler。
- Catalog semantic-version range 僅保存 minimum version，MVP 不做完整 semver resolver。
- Runtime transport route 名稱仍未正式化；可信 Application Context 由 composition 建立。
- Configuration schema 驗證目前只提供通用大小、深度與 Secret 規則；各模組專屬 validator 待後續版本。
- PR #20 production admission adapter 尚未部署；Local tests 使用 deterministic adapter。
- Lifecycle 為 Platform Service Candidate；Production Use Not Allowed。