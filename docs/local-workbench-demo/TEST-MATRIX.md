# Test Matrix

測試涵蓋 local-mode fail closed、same-origin、CSRF、allowlist、context injection、session digest、XSS sink scan、正式 Migration 與 local fixture schema 分離、seed replay、Tenant/Application fixtures、Event/Network data、formal Workbench query/mutation、missing slots、explicit confirmation、duplicate confirmation replay、prompt injection、permission denial、opaque reference 與 conversation reset。

完整 Gate：`npm test`、`npm run typecheck`、`npm run build`、`npm run build:local-demo`、`npm audit --audit-level=high`、fresh Local D1 0001～0007 + local schema、browser smoke、Markdown/encoding/secret/provider/remote scan、`git diff --check`。