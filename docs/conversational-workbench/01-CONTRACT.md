# Conversational Workbench Contract

狀態：Contract Approved by Tony；Architecture Review Approved；Security Review Approved；Lifecycle Experience Platform Service Candidate；Locally Implemented／Locally Verified；Not Deployed；Production Use Not Allowed。

Workbench 擁有 Session、Intent resolution、Slot revision、Operation Plan、Confirmation、safe response 與 tool orchestration。它不擁有 Domain business rules、Authority、Entitlement、Permission、Traffic policy、AI credential、transport 或 Domain persistence。

所有可執行 operation 必須同時存在於 versioned Intent Registry 與 typed Operation Router allowlist。Domain command/query 僅能透過 public Application Service，並維持 Trusted Context → Traffic → Application／Module → Permission → Access Fence → Domain invocation 的既有順序。
