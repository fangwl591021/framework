# Correction and Reversal Standard

> Conceptual Historical Safety Standard · Not a Schema

## Operation Semantics

| Operation | Meaning | Completed Original Exists? | Required History |
| --- | --- | --- | --- |
| Cancel | Intent 尚未完成前取消 | No completed transaction | Intent、Actor、Reason、Cancelled State |
| Reject | 驗證失敗，交易未成立 | No | Evidence summary、Failure Category |
| Reverse | 原交易已成立，建立反向紀錄抵消效果 | Yes | Original Reference、Reverse Record、Reason |
| Correct | 保留原結果，建立新的正式修正版本 | Yes／Historical Result | Old／New、Evidence、Decision、Version |
| Adjust | 授權人工處理無法由一般交易表示的差額 | Yes or reconciled gap | Case、Approval、Amount、Reason |
| Delete | 物理移除 | Completed transaction 禁止 | 只依法定 Privacy／Retention 流程，且不破壞 Ledger |

不得使用 Delete 清除已成立 Point Transaction、Attendance、Redemption、Referral History、Attribution Record 或 Audit Record。法定個資刪除使用 Anonymization／Retention Policy，保留必要財務與稽核關聯。

## Required Contract Fields

每種操作需定義 Allowed State、Actor、Permission、Reason、Approval、Audit、Related Original Record、Resulting State、Notification Requirement、Idempotency Key、Failure／Retry Behavior。

## Module Rules

- Point：Reverse 建立相反 Ledger；Adjust 不取代正常 Grant／Deduct。
- Referral：Replace／Correct 保留舊 Relationship；Confirmed 後無 Self-service Change。
- Attribution：Correct／Reverse 保留原 Decision Evidence 與 Policy Version。
- Attendance：Correct／Revoke 保留原 Confirmation；下游 Point 需獨立 Compensation。
- Redemption：Reverse 關聯原 Intent／Point Transaction；Notification 不決定反轉。

## Approval and Audit

高風險 Point Adjust、Referral Change、Identity Merge、Attribution Correction、Redemption Reverse 必須分離 Requester／Approver 或由明確 Policy 核准。Audit 需包含 Source、Target、Before／After、Evidence、Actor、Approver、Time、Reason、Correlation；不得含 Secret 或不必要 PII。

## Failure and Recovery

- Correction workflow 部分失敗時保存 Pending／Failed 狀態，不假設跨 Module Atomicity。
- 重試沿用同 Case／Command Key。
- 已成功 Reverse 不得因 Notification 失敗再次 Reverse。
- 無法自動 Reconcile 時進 Manual Review，不直接改資料。

相關決策：[ADR-012](adr/ADR-012-TRANSACTION-REVERSAL-NOT-DELETION.md)。
