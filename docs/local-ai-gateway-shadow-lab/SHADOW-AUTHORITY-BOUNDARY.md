# Shadow Authority Boundary

The shadow path may classify and compare an allowlisted local input. It has no business authority.

| Capability | Formal deterministic path | Shadow path |
| --- | --- | --- |
| Resolve formal intent | Yes | Candidate only |
| Create operation plan | Yes, through Workbench policy | No |
| Request or bypass confirmation | Formal policy only | No |
| Invoke operation router or tool | Formal confirmed path only | No |
| Execute domain callback or mutation | Formal confirmed path only | No |
| Select arbitrary provider/model/endpoint | No | No |

The UI always reports `deterministic_only` or `clarification_required` as final authority. Shadow comparison runs after the formal Workbench response and its failure cannot replace, retry, or roll back that response.

`gateway_shadow` is composed only by the Local Demo entry. Production Workbench remains deterministic-only.
