# Test Execution Lifecycle

Designed → Reviewed → Approved → Implemented → Dry Run → Executed → Evidence Captured → Reviewed → Accepted／Rejected → Retained／Archived。

| Stage | Entry／Exit | Owner | Allowed Changes | Required Evidence |
| --- | --- | --- | --- | --- |
| Designed | requirement mapped／review ready | Test Designer | specification only | source mapping |
| Reviewed | independent findings resolved | Technical＋Security Reviewer | plan corrections | review record |
| Approved | all required gates pass | approval authorities | no silent scope change | approval decision |
| Implemented | approved design translated | Implementer | test code in separate sprint | implementation diff |
| Dry Run | isolated target verified | Test Operator | non-authoritative rehearsal | manifest／stop checks |
| Executed | authorized run completed | Test Operator | no plan mutation | raw evidence |
| Evidence Captured | required artifacts complete | Operator | sanitization only | evidence record |
| Reviewed | reproducibility／security reviewed | Evidence Reviewers | annotations | review outcome |
| Accepted／Rejected | decision recorded | approval authority | decision only | signed record |
| Retained／Archived | retention applied | Evidence Custodian | controlled lifecycle | retention log |


## Lifecycle Criteria

每個 Stage 必須分別定義 Entry Criteria、Exit Criteria、Owner、Allowed Changes、Required Evidence 與 Invalidation Rule；Entry／Exit 摘要不得取代具體 Gate 判定。

Invalidation Rule：Schema、Contract、ADR、Fixture、Test implementation 或 environment 變更時，必須重新判定既有 Test／Evidence 是否有效，並記錄 Invalidated 或維持有效的理由。
Schema、Contract、ADR、Fixture、Test implementation 或 environment 變更時，必須判定既有 Test／Evidence 是否 Invalidated。任何 stage 不得由前一 stage 自動推導。
