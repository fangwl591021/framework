import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../../src/local-demo/worker";
import { AI_LAB_SCENARIOS } from "../../src/local-demo/ai-lab-models";
import { readFixture, seedFixture } from "../../src/local-demo/seed";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
const assets = {
  fetch: async (request: Request) => {
    const path = new URL(request.url).pathname;
    if (["/local/ai-lab/", "/local/ai-lab/requests/", "/local/ai-lab/usage/"].includes(path))
      return new Response("<!doctype html><title>Local AI Lab</title>", {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    if (path.startsWith("/local/ai-lab/")) return new Response("asset");
    return new Response("Not Found", { status: 404 });
  },
};
const localEnv = {
  LOCAL_DEMO_DB: env.DB,
  LOCAL_DEMO_MODE: "enabled",
  ASSETS: assets,
};
const req = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, init);
let cookie = "";
let csrf = "";

async function session(fixtureKey = "owner_a") {
  const response = await worker.fetch(
    req("/local/api/session", {
      method: "POST",
      headers: { Origin: "http://localhost", "Content-Type": "application/json" },
      body: JSON.stringify({ fixtureKey }),
    }),
    localEnv,
  );
  const data = (await response.json()) as { csrf: string };
  cookie = response.headers.get("Set-Cookie")?.split(";")[0] ?? "";
  csrf = data.csrf;
  return response;
}

const get = (path: string, environment = localEnv) =>
  worker.fetch(req(path, { headers: cookie ? { Cookie: cookie } : {} }), environment);

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  worker.fetch(
    req(path, {
      method: "POST",
      headers: {
        Origin: "http://localhost",
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-Local-CSRF": csrf,
        ...headers,
      },
      body: JSON.stringify(body),
    }),
    localEnv,
  );

const simulation = (scenario: string, suffix = scenario) => ({
  taskKey: "workbench.intent_resolution",
  scenario,
  budgetFixture: "generous",
  cacheDirective: "allow",
  text: scenario === "low_confidence" ? "ambiguous local statement" : "create event",
  idempotencyKey: `local-lab:${suffix}`,
});

describe("Local AI Gateway Shadow Lab integration", () => {
  beforeAll(async () => {
    await reset();
    await applyD1Migrations(env.DB, [...migrations]);
    for (const statement of env.LOCAL_DEMO_SCHEMA.split(";")
      .map((value) => value.trim())
      .filter(Boolean))
      await env.DB.prepare(statement).run();
    await seedFixture(env.DB);
    await session();
  });

  it.each([
    ["/local/ai-lab", "/local/ai-lab/"],
    ["/local/ai-lab/requests", "/local/ai-lab/requests/"],
    ["/local/ai-lab/usage", "/local/ai-lab/usage/"],
  ])("canonicalizes %s once", async (path, target) => {
    const first = await get(path);
    expect(first.status).toBe(307);
    expect(first.headers.get("Location")).toBe(`http://localhost${target}`);
    expect((await get(target)).status).toBe(200);
  });

  it("preserves query strings through AI Lab canonicalization", async () => {
    const response = await get("/local/ai-lab?scenario=cache_hit");
    expect(response.headers.get("Location")).toBe(
      "http://localhost/local/ai-lab/?scenario=cache_hit",
    );
  });

  it("keeps API routes separate from page canonicalization", async () => {
    const response = await get("/local/api/ai-lab/tasks");
    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
    expect(response.headers.get("Content-Type")).toContain("application/json");
  });

  it("fails all AI Lab routes closed outside local mode", async () => {
    const outside = { ...localEnv, LOCAL_DEMO_MODE: "production" };
    expect((await get("/local/ai-lab/", outside)).status).toBe(404);
    expect((await get("/local/api/ai-lab/tasks", outside)).status).toBe(404);
  });

  it.each(["tenantId", "applicationId", "actorId", "provider", "model", "endpoint", "qualityTier"])(
    "rejects browser authority override %s",
    async (key) => {
      const response = await post("/local/api/ai-lab/simulate", {
        ...simulation("cache_miss_local_provider_success", `override-${key}`),
        [key]: "forged",
      });
      expect(response.status).toBe(400);
    },
  );

  it("rejects arbitrary budget values", async () => {
    const response = await post("/local/api/ai-lab/simulate", {
      ...simulation("budget_exceeded", "bad-budget"),
      budgetFixture: "unlimited",
    });
    expect(response.status).toBe(400);
  });

  it("requires Same-Origin and CSRF for simulation", async () => {
    const noCsrf = await worker.fetch(
      req("/local/api/ai-lab/simulate", {
        method: "POST",
        headers: {
          Origin: "http://localhost",
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify(simulation("cache_miss_local_provider_success", "csrf")),
      }),
      localEnv,
    );
    expect(noCsrf.status).toBe(403);
    expect(
      (
        await post(
          "/local/api/ai-lab/simulate",
          simulation("cache_miss_local_provider_success", "origin"),
          { Origin: "https://evil.invalid" },
        )
      ).status,
    ).toBe(403);
  });

  it("denies a member fixture without AI Gateway permission", async () => {
    await session("member_a");
    expect((await get("/local/api/ai-lab/tasks")).status).toBe(403);
    expect((await post("/local/api/ai-lab/reset", {})).status).toBe(403);
    await session("owner_a");
  });

  it.each(AI_LAB_SCENARIOS)("runs deterministic bounded scenario %s", async (scenario) => {
    const response = await post(
      "/local/api/ai-lab/simulate",
      simulation(scenario, `scenario-${scenario}`),
    );
    expect(response.status).toBe(200);
const data = (await response.json()) as any;
    const expectedStatus: Record<string, string> = {
      cache_hit: "cached",
      budget_exceeded: "rejected",
      provider_disabled: "failed",
      provider_timeout: "failed",
      fallback_to_deterministic_local: "fallback",
      invalid_structured_output: "rejected",
      unsafe_output: "rejected",
      unallowlisted_intent: "rejected",
      circuit_open: "rejected",
      stale_provider_completion: "rejected",
      request_conflict: "rejected",
      retired_task_cache_rejected: "rejected",
    };
    expect(data.result.status).toBe(expectedStatus[scenario] ?? "completed");
    expect(data.result.supportCode).toMatch(/^AIL-[A-F0-9]{16}$/);
    expect(data.result.timeline.length).toBeGreaterThan(1);
    expect(data.result.timeline.length).toBeLessThan(20);
    expect(data.result.summary.authority).toEqual({
      final: expect.stringMatching(/^(deterministic_only|clarification_required)$/),
      shadowCanCreatePlan: false,
      shadowCanInvokeTool: false,
      shadowCanMutate: false,
      shadowCanConfirm: false,
    });
    expect(JSON.stringify(data)).not.toContain("<script>");
  });

  it("replays identical local evidence without duplicate accounting", async () => {
    const value = simulation("idempotent_replay", "same-replay");
    const first = (await (await post("/local/api/ai-lab/simulate", value)).json()) as any;
    const before = await env.DB.prepare("SELECT count(*) n FROM ai_usage_records").first<{ n: number }>();
    const second = (await (await post("/local/api/ai-lab/simulate", value)).json()) as any;
    const after = await env.DB.prepare("SELECT count(*) n FROM ai_usage_records").first<{ n: number }>();
    expect(second.result.requestId).toBe(first.result.requestId);
    expect(second.result.replayed).toBe(true);
    expect(after?.n).toBe(before?.n);
  });

  it("rejects the same key with a different fingerprint", async () => {
    const value = simulation("cache_miss_local_provider_success", "conflict-evidence");
    expect((await post("/local/api/ai-lab/simulate", value)).status).toBe(200);
    expect(
      (
        await post("/local/api/ai-lab/simulate", {
          ...value,
          text: "list events",
        })
      ).status,
    ).toBe(409);
  });

  it("stores only digests and bounded safe evidence", async () => {
    const secretInput = "prompt-that-must-not-be-stored-9387";
    await post("/local/api/ai-lab/simulate", {
      ...simulation("cache_miss_local_provider_success", "safe-storage"),
      text: secretInput,
    });
    const rows = await env.DB.prepare(
      "SELECT input_digest,idempotency_digest,timeline_json,summary_json FROM local_ai_lab_evidence",
    ).all<Record<string, string>>();
    expect(JSON.stringify(rows.results)).not.toContain(secretInput);
    expect(rows.results.every((row) => String(row.input_digest).length === 64)).toBe(true);
    expect(rows.results.every((row) => String(row.idempotency_digest).length === 64)).toBe(true);
  });

  it("keeps Tenant Owner request history isolated", async () => {
    await session("owner_tenant_b");
    await post(
      "/local/api/ai-lab/simulate",
      simulation("cache_miss_local_provider_success", "tenant-b-history"),
    );
    const tenantB = (await (await get("/local/api/ai-lab/requests?limit=50")).json()) as any;
    expect(tenantB.requests.length).toBeGreaterThan(0);
    expect(new Set(tenantB.requests.map((row: any) => row.tenantScope)).size).toBe(1);
    await session("owner_a");
    const tenantA = (await (await get("/local/api/ai-lab/requests?limit=50")).json()) as any;
    const fixture = (await readFixture(env.DB))!;
    expect(tenantA.requests.every((row: any) => row.tenantScope !== fixture.tenantB)).toBe(true);
  });

  it("allows only the platform operator fixture to aggregate tenants", async () => {
    await session("operator_a");
    const aggregate = (await (await get("/local/api/ai-lab/requests?limit=50")).json()) as any;
    expect(new Set(aggregate.requests.map((row: any) => row.tenantScope)).size).toBeGreaterThan(1);
    const usage = (await (await get("/local/api/ai-lab/usage")).json()) as any;
    expect(usage.usage.scope).toBe("platform");
    await session("owner_a");
    const tenantUsage = (await (await get("/local/api/ai-lab/usage")).json()) as any;
    expect(tenantUsage.usage.scope).toBe("tenant");
  });

  it("bounds request pagination and usage date ranges", async () => {
    const requests = (await (await get("/local/api/ai-lab/requests?limit=9999")).json()) as any;
    expect(requests.requests.length).toBeLessThanOrEqual(50);
    const usage = (await (await get("/local/api/ai-lab/usage?from=0&until=4102444800000")).json()) as any;
    expect(usage.usage.range.until - usage.usage.range.from).toBeLessThanOrEqual(90 * 86_400_000);
    expect(usage.usage.costLabel).toBe("Estimate - Not Billing");
  });

  it("returns the provider catalog without secret references or dynamic endpoints", async () => {
    const data = (await (await get("/local/api/ai-lab/catalog")).json()) as any;
    expect(data.providers.map((item: any) => item.provider)).toEqual([
      "deterministic_local_adapter",
      "disabled_generic_adapter",
      "disabled_openai_adapter",
    ]);
    const encoded = JSON.stringify(data);
    expect(encoded).not.toMatch(/secretReference|credential|apiKey|endpoint|https?:\/\//i);
  });

  it.each(["tasks", "policies", "budgets", "requests", "usage"])(
    "returns bounded %s API data",
    async (route) => {
      const response = await get(`/local/api/ai-lab/${route}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect((await response.text()).length).toBeLessThan(200_000);
    },
  );

  it("resets only current local Lab evidence and preserves formal usage", async () => {
    const usageBefore = await env.DB.prepare("SELECT count(*) n FROM ai_usage_records").first<{ n: number }>();
    expect((await post("/local/api/ai-lab/reset", {})).status).toBe(200);
    const evidence = await env.DB.prepare("SELECT count(*) n FROM local_ai_lab_evidence").first<{ n: number }>();
    const usageAfter = await env.DB.prepare("SELECT count(*) n FROM ai_usage_records").first<{ n: number }>();
    expect(evidence?.n).toBeGreaterThan(0);
    expect(usageAfter?.n).toBe(usageBefore?.n);
  });

  it("keeps health and readiness regressions green", async () => {
    expect((await worker.fetch(req("/health"), localEnv)).status).toBe(404);
    expect((await worker.fetch(req("/ready"), localEnv)).status).toBe(404);
  });
});
