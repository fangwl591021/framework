# Migration Test Execution Control Plan

> Planned governance contract only. It establishes the conditions an approved future test implementation must enforce.

## Deterministic run identity

| Field | Required value |
| --- | --- |
| Run ID | immutable `rc1-<stage>-<yyyyMMdd>-<sequence>` value |
| Target identity | approved isolated resource identifier, redacted in shared evidence when needed |
| Source | repository, commit SHA, schema proposal SHA, migration SHA |
| Fixture | fixture ID, immutable version/hash, fixed seed |
| Setup | manifest reference and expected pre-state digest |
| Re-run | new Run ID; prior Run ID and outcome must be linked, never overwritten |
| Cleanup | explicit target identity, prefix match proof, post-cleanup residual scan |

## Mandatory preflight and stop matrix

| Check | Required action on failure |
| --- | --- |
| Architecture and Security test-plan approvals are both recorded | stop; do not create or access a test target |
| target identity is missing, not isolated, or does not match the approved manifest | stop; capture no database contents |
| target name lacks the controlled test prefix | stop |
| commit/schema/migration/fixture hash differs from manifest | stop; mark run invalidated |
| production identifier, real PII, credential, token, or unknown data is detected | stop; restrict artifact access and escalate to Security Reviewer |
| unexpected object or trigger hash is found | stop; record sanitized object/hash evidence |
| evidence capture cannot record before/after state or exit code | stop; never mark pass |
| cleanup target differs from manifest or prefix proof fails | stop cleanup; preserve isolated target for review |

## Artifact and retention rules

- Evidence is restricted to Architecture Owner, assigned Security Reviewer, Test Operator, and designated Evidence Custodian until review closes.
- Store only sanitized logs, hashes, row counts, query plans, and synthetic identifiers. Never store secrets, tokens, full PII, or production resource names.
- Failed and blocked runs are retained with their retry relationship. No record may be overwritten.
- Retention class and expiry are required in every Evidence Record; deletion/archival is a separate approved operation.

## Cleanup failure contract

1. Do not retry a cleanup command when target identity is uncertain.
2. Mark the run `Blocked`, retain the manifest and residual-scan evidence, and escalate to the Security Reviewer.
3. A later cleanup uses a new control record linked to the original run; it must prove the same approved isolated target and controlled prefix.
4. No new run may reuse a target with unresolved residual state.
