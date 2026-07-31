# Environment Separation

The trusted deployment configuration, never a Client Header, selects `development`, `staging`, or `production`.

| Environment | D1 | Secret Provider | Promotion |
| --- | --- | --- | --- |
| development | Independent logical reference | Independent logical reference | May promote only to staging |
| staging | Independent logical reference | Must not reuse Production Secret | May promote only to production |
| production | Independent logical reference | Production-only logical reference | Explicitly approved Release only |

`EnvironmentManifest` must contain exactly one configuration for each environment. D1 references, Secret-provider references, and environment names must all be unique. `EnvironmentGuard` fails closed on missing, duplicated, malformed, or skipped environments.

`EnvironmentConfigurationService` validates a trusted change and records minimal Audit evidence. This local structure does not create bindings or authorize deployment.
