# Routing Policy

Policy 依 Application、Tenant、Platform 的優先序選擇，並綁定 Task Version 與 Quality Tier。Route Chain 最多兩個不重複 hop，不允許 cycle。

Caller 不可指定 Provider、Model、URL 或 fallback 次序；選擇只由受治理 Policy 決定。
