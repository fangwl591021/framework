# Capability Matrix

Status: Lifecycle **Readiness Candidate**; Real LINE Adapter **Disabled**; Credentials **Not Provisioned**; Remote D1 **Not Used**; Deployment **Not Performed**; Production Use **Not Allowed**.

| Neutral response | Planned LINE representation | Readiness disposition |
| --- | --- | --- |
| Text | Text | Supported contract |
| Confirmation | Flex | Degraded contract |
| Cards | Flex | Degraded contract |
| Image, video, audio, location, sticker | Matching message family | Supported contract |
| Unsupported | No reply | Rejected safely |

Every decision has `executable=false`. The matrix describes future rendering intent only and grants no transport authority. Device/version-dependent Flex behavior must retain a bounded text fallback, consistent with [LINE Flex Message limitations](https://developers.line.biz/en/docs/messaging-api/using-flex-messages/).
