import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AI_LAB_BUDGET_FIXTURES,
  AI_LAB_SCENARIOS,
  AI_LAB_TASKS,
  parseAiLabSimulation,
} from "../src/local-demo/ai-lab-models";

const valid = {
  taskKey: "workbench.intent_resolution",
  scenario: "cache_miss_local_provider_success",
  budgetFixture: "generous",
  cacheDirective: "allow",
  text: "create event",
  idempotencyKey: "local-lab:test-key",
} as const;

describe("Local AI Gateway Shadow Lab browser and input boundary", () => {
  it("accepts only the documented simulation contract", () =>
    expect(parseAiLabSimulation(valid)).toEqual(valid));

  it.each([
    "tenantId",
    "applicationId",
    "actorId",
    "provider",
    "model",
    "endpoint",
    "qualityTier",
    "budget",
  ])("rejects client authority override %s", (key) =>
    expect(() => parseAiLabSimulation({ ...valid, [key]: "forged" })).toThrow(
      "UNTRUSTED_OVERRIDE_FIELD",
    ),
  );

  it("enforces the scenario allowlist", () =>
    expect(() =>
      parseAiLabSimulation({ ...valid, scenario: "network_call" }),
    ).toThrow("SCENARIO_NOT_ALLOWED"));

  it("enforces the server budget fixture allowlist", () =>
    expect(() =>
      parseAiLabSimulation({ ...valid, budgetFixture: "unlimited" }),
    ).toThrow("BUDGET_FIXTURE_NOT_ALLOWED"));

  it("enforces the registered task allowlist", () =>
    expect(() =>
      parseAiLabSimulation({ ...valid, taskKey: "admin.root" }),
    ).toThrow("TASK_NOT_ALLOWED"));

  it("bounds input and idempotency values", () => {
    expect(() =>
      parseAiLabSimulation({ ...valid, text: "x".repeat(2001) }),
    ).toThrow("INPUT_INVALID");
    expect(() =>
      parseAiLabSimulation({ ...valid, idempotencyKey: "short" }),
    ).toThrow("IDEMPOTENCY_KEY_INVALID");
  });

  it("defines every approved deterministic scenario", () => {
    expect(AI_LAB_SCENARIOS).toHaveLength(18);
    expect(AI_LAB_SCENARIOS).toContain("stale_provider_completion");
    expect(AI_LAB_SCENARIOS).toContain("request_conflict");
  });

  it("defines all five bounded budget fixtures", () =>
    expect(AI_LAB_BUDGET_FIXTURES).toEqual([
      "generous",
      "tight",
      "exhausted",
      "concurrency_limited",
      "premium_blocked",
    ]));

  it("uses the formal AI task registry keys", () => {
    expect(AI_LAB_TASKS).toContain("workbench.intent_resolution");
    expect(AI_LAB_TASKS).toContain("diagnostics.safe_summary");
  });

  it("renders all browser values with textContent only", () => {
    const script = readFileSync("local-demo/public/local/ai-lab/app.js", "utf8");
    expect(script).toContain("textContent");
    expect(script).toContain("replaceChildren");
    expect(script).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  });

  it("shows the three non-production authority banners", () => {
    const html = readFileSync("local-demo/public/local/ai-lab/index.html", "utf8");
    expect(html).toContain("LOCAL SHADOW SIMULATION");
    expect(html).toContain("NO EXTERNAL PROVIDER");
    expect(html).toContain("NO PRODUCTION AUTHORITY");
  });

  it("renders all required lab cards", () => {
    const html = readFileSync("local-demo/public/local/ai-lab/index.html", "utf8");
    for (const id of [
      "timeline",
      "comparison",
      "route",
      "budget-card",
      "cache-card",
      "validation",
      "usage-card",
      "safe-result",
      "catalog",
    ]) expect(html).toContain(`id="${id}"`);
  });

  it("keeps production entry isolated from the local lab", () => {
    const source = readFileSync("src/index.ts", "utf8");
    expect(source).not.toMatch(/ai-lab|gateway_shadow|local-demo/);
  });

  it("keeps formal migration 0008 free of local lab schema", () => {
    const migration = readFileSync("migrations/0008_ai_gateway.sql", "utf8");
    expect(migration).not.toContain("local_ai_lab_evidence");
  });

  it("keeps local fixtures in the isolated local schema", () => {
    const schema = readFileSync("local-demo/schema.sql", "utf8");
    expect(schema).toContain("local_ai_lab_evidence");
    expect(schema).toContain("idempotency_digest");
    expect(schema).toContain("input_digest");
  });

  it("keeps Workbench final authority deterministic", () => {
    const script = readFileSync("local-demo/public/local/workbench/app.js", "utf8");
    expect(script).toContain("deterministic_only");
    expect(script).not.toContain("shadowCanMutate = true");
  });

  it("documents estimate-only cost rather than billing", () => {
    const usage = readFileSync(
      "local-demo/public/local/ai-lab/usage/index.html",
      "utf8",
    );
    expect(usage).toContain("ESTIMATE - NOT BILLING");
  });
});
