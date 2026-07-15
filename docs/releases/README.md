# Framework Release Baselines

此目錄記錄 Platform Core Framework 的架構與文件版本基準。Repository 名稱固定為 `framework`；RC1、RC2、v1.0.0 等是 Release Version，不是 Repository 名稱。Release 文件只證明指定基準所包含的決策與契約，不代表程式已部署。

## Version Meaning

| 類型 | 意義 |
| --- | --- |
| RC | Release Candidate；供架構、契約與證據審查，可能仍有阻塞 |
| Stable | 所有指定 Gate 與驗證完成後，另行核准的穩定基準 |
| Patch | 不改變既有公開契約的修正版本 |
| Breaking Version | 含不相容邊界變更，必須有 ADR、migration 與 compatibility review |

## 版本路徑

RC1 → RC2 → v1.0.0 → v1.1.0 → v2.0.0。

正式 Git Tag／GitHub Release 必須另行批准；合併本目錄不會建立 Tag 或發布 Release。

## RC1 導航

- [RC1 Baseline](RC1.md)
- [RC1 Component Matrix](RC1-COMPONENT-MATRIX.md)
- [RC1 Known Limitations](RC1-KNOWN-LIMITATIONS.md)
- [RC1 Freeze Policy](RC1-FREEZE-POLICY.md)
- [Approved Migration Package Design](../migration-package/README.md)
