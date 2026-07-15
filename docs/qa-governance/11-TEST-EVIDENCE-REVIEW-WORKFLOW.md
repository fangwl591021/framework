# Test Evidence Review Workflow

Operator submits → Technical Reviewer checks reproducibility → Security Reviewer checks sanitization／scope → Architecture Owner checks requirement mapping → Decision recorded。

| Result | Meaning |
| --- | --- |
| Accepted | complete, reproducible, mapped and authorized |
| Accepted with Conditions | limited acceptance with explicit conditions |
| Rejected | evidence disproves or cannot support claim |
| Needs Re-run | plan valid but run／capture incomplete |
| Invalid Evidence | wrong scope、hash、environment、tampering or unsafe artifact |

CI green 不會自動 Accepted。Reviewer 必須驗證 commit／schema／migration／fixture hash、Run ID、final state、sanitization、retention 與 previous retry link；不得同時虛構或代填 Operator evidence。
