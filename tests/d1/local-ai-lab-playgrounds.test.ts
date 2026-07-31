import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { aiLabContext } from "../../src/local-demo/ai-lab-models";
import { LocalAiLabService } from "../../src/local-demo/ai-lab-service";
import { seedFixture, type DemoFixtureState } from "../../src/local-demo/seed";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
let fixture: DemoFixtureState;
let lab: LocalAiLabService;
const input = (scenario: string, suffix: string) => ({
  taskKey: "workbench.intent_resolution" as const,
  scenario: scenario as any,
  budgetFixture: "generous" as const,
  cacheDirective: "allow" as const,
  text: "create event",
  idempotencyKey: `local-lab:${suffix}`,
});

describe("Local AI Lab budget, cache and fallback playgrounds", () => {
  beforeAll(async () => {
    await reset();
    await applyD1Migrations(env.DB, [...migrations]);
    for (const statement of env.LOCAL_DEMO_SCHEMA.split(";")
      .map((value) => value.trim())
      .filter(Boolean))
      await env.DB.prepare(statement).run();
    fixture = await seedFixture(env.DB);
    lab = new LocalAiLabService(env.DB, fixture);
  });

  it("rejects a concurrency-limited budget through the formal budget service", async () => {
    const result = await lab.simulate(aiLabContext(fixture, "owner_a"), {
      ...input("cache_miss_local_provider_success", "concurrency-budget"),
      budgetFixture: "concurrency_limited",
    });
    expect(result.status).toBe("rejected");
    expect(result.timeline.map((row) => row.stage)).toContain("budget_rejected");
  });

  it("rejects the premium-blocked budget fixture", async () => {
    const result = await lab.simulate(aiLabContext(fixture, "owner_a"), {
      ...input("cache_miss_local_provider_success", "premium-budget"),
      budgetFixture: "premium_blocked",
    });
    expect(result.status).toBe("rejected");
    expect((result.summary.budget as any).decision).toBe("rejected");
  });

  it("limits fallback to exactly two allowlisted local attempts", async () => {
    const result = await lab.simulate(
      aiLabContext(fixture, "owner_a"),
      input("fallback_to_deterministic_local", "two-hop-fallback"),
    );
    expect((result.summary.route as any).fallbackChain).toEqual([
      "disabled_generic_adapter",
      "deterministic_local_adapter",
    ]);
    expect((result.summary.route as any).externalProvider).toBe(false);
  });

  it("shows scoped cache miss then hit without raw cache material", async () => {
    const context = aiLabContext(fixture, "owner_a");
    const miss = await lab.simulate(
      context,
      input("cache_miss_local_provider_success", "cache-visual-miss"),
    );
    const hit = await lab.simulate(context, input("cache_hit", "cache-visual-hit"));
    expect((miss.summary.cache as any).scope).toBe("tenant+application");
    expect(hit.status).toBe("cached");
    expect(String((hit.summary.cache as any).keyDigestPrefix).length).toBeLessThanOrEqual(12);
    expect(JSON.stringify(hit)).not.toContain("create event");
  });

  it("requires clarification for low confidence without granting authority", async () => {
    const result = await lab.simulate(
      aiLabContext(fixture, "owner_a"),
      { ...input("low_confidence", "low-confidence-authority"), text: "ambiguous local statement" },
    );
    expect((result.summary.comparison as any).finalAuthority).toBe(
      "clarification_required",
    );
    expect((result.summary.authority as any).shadowCanConfirm).toBe(false);
  });
  it("summarizes completed, rejected and fallback evidence without N+1", async () => {
    const usage = await lab.usage(
      aiLabContext(fixture, "owner_a"),
      0,
      Date.now() + 1,
    );
    expect(Number((usage.totals as any).requests)).toBeGreaterThanOrEqual(5);
    expect(Number((usage.totals as any).rejected)).toBeGreaterThanOrEqual(2);
    expect(Number((usage.totals as any).fallback)).toBeGreaterThanOrEqual(1);
    expect(usage.byOutcome.length).toBeLessThanOrEqual(20);
  });
});
