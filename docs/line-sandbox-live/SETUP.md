# Setup

No credential value belongs in source, tests, documentation, command history, or committed local-variable files.

Choose a stable public routing identifier and replace the non-secret `LINE_BINDING_KEY` placeholder in `wrangler.line-sandbox.jsonc`. It must start with a lowercase letter, contain only lowercase letters, digits, `_` or `-`, and be 3–48 characters. This first deployment maps exactly that one key to the two Cloudflare secrets below.

After Architecture and Security approval, an authorized operator may run these commands interactively from the repository root:

```powershell
npm.cmd run build:line-sandbox
npx.cmd wrangler secret put LINE_CHANNEL_SECRET --config wrangler.line-sandbox.jsonc
npx.cmd wrangler secret put LINE_CHANNEL_ACCESS_TOKEN --config wrangler.line-sandbox.jsonc
npm.cmd run deploy:line-sandbox
```

Wrangler prompts for each value. Do not place a value on the command line and do not pipe it from shell history.

The expected default webhook URL format is:

```text
https://platform-core-line-sandbox-live.<YOUR_WORKERS_DEV_SUBDOMAIN>.workers.dev/webhook/<LINE_BINDING_KEY>
```

Configure that HTTPS URL in the intended first LINE sandbox channel only. Do not reuse Production credentials or connect this Worker to Platform Core runtime bindings. Adding another OA requires a governed binding registry or secret provider and a separate architecture/security approval; changing the URL alone is not onboarding.
