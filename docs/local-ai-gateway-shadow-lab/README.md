# Local AI Gateway Shadow Lab

Status: Local Development Only / Locally Implemented / Locally Verified

The Local AI Gateway Shadow Lab makes the provider-neutral AI Gateway decision path observable without granting it production authority. It is a local sidecar to the Conversational Workbench: the deterministic resolver remains the only source of formal intent, operation plans, confirmations, tools, and mutations.

Start the isolated database and Worker:

```text
npm run local:reset
npm run local:dev
```

Open `http://localhost:8787/local/ai-lab/`.

The repository contains no external provider credential, production binding, remote D1 access, or production AI mode for this lab.

## Documents

- [Local AI Gateway Lab Guide](LOCAL-AI-GATEWAY-LAB-GUIDE.md)
- [Shadow Authority Boundary](SHADOW-AUTHORITY-BOUNDARY.md)
- [Simulation Scenarios](SIMULATION-SCENARIOS.md)
- [Budget Playground](BUDGET-PLAYGROUND.md)
- [Cache Playground](CACHE-PLAYGROUND.md)
- [Usage Dashboard](USAGE-DASHBOARD.md)
- [Security Boundary](SECURITY-BOUNDARY.md)
- [Test Matrix](TEST-MATRIX.md)
- [Known Limitations](KNOWN-LIMITATIONS.md)
