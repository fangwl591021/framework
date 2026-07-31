# Operation Router

`AllowlistedOperationRouter` 不接受 reflection、自然語言 method name 或任意 tool。Adapter 的 module key、operation key 與 Intent/Plan 必須完全一致。

`EventWorkbenchAdapter`、`BusinessNetworkWorkbenchAdapter` 經 Application Module Gateway；`ApplicationAssemblyWorkbenchAdapter` 與 `DiagnosticsWorkbenchAdapter` 經 Traffic-first Platform Service boundary。Adapter 只持有 typed public Application Service ports，不 import Workbench Repository、Domain Repository 或 SQL。
