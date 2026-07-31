# Local AI Gateway Lab Guide

## Entry points

- `/local/ai-lab/` runs allowlisted simulations and shows route, budget, cache, validation, usage, support code, and safe timeline evidence.
- `/local/ai-lab/requests/` lists bounded local evidence and opens a safe detail view.
- `/local/ai-lab/usage/` shows bounded usage summaries.
- `/local/workbench/` includes a shadow comparison panel beside the formal deterministic result.

All pages and APIs require localhost or `127.0.0.1` plus Local Demo Mode. Page, asset, and API routes are separate and follow the canonical trailing-slash policy. Non-local requests return 404.

## Workflow

1. Run `npm run local:reset`.
2. Run `npm run local:dev`.
3. Open `http://localhost:8787/local/ai-lab/`.
4. Select a server-allowlisted actor, task, scenario, budget fixture, and cache directive.
5. Submit an input. The server derives Tenant, Application, actor, provider route, quality tier, and limits from trusted fixtures.
6. Inspect the safe timeline and comparison. The formal authority remains deterministic.

Reset deletes only current Tenant/Application local Lab evidence, invalidates current local cache entries, and restores the local budget fixture. Immutable formal AI usage evidence remains.
