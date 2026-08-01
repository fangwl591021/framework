# Verification

Before any authorized deployment:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run build:local-demo
npm.cmd run build:line-sandbox
npm.cmd audit --audit-level=high
git diff --check
```

After an authorized deployment, verify without exposing secrets:

1. `GET https://platform-core-line-sandbox-live.<YOUR_WORKERS_DEV_SUBDOMAIN>.workers.dev/health` returns HTTP 200, service status, and the configured public binding identifier without credentials.
2. Missing, malformed, unknown, and mismatched `/webhook/{bindingKey}` routes return HTTP 404 before reading the body.
3. LINE Console webhook verification at `/webhook/<LINE_BINDING_KEY>` with an empty `events` array returns HTTP 200.
4. A sandbox text message receives `收到：<original text>`.
5. Unsupported events receive HTTP 200 without a reply.
6. Logs contain only allowlisted reason codes and never request bodies, user IDs, reply tokens, authorization headers, access tokens, or channel secrets.
7. Provider reply failures produce a bounded reason code and exactly one outbound attempt.

This repository change did not perform these remote checks or deploy the Worker. It validates only the first explicitly configured OA binding; arbitrary OA onboarding remains unsupported.
