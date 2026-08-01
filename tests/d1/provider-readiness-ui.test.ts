import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../../src/local-demo/worker";
import { seedFixture } from "../../src/local-demo/seed";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
const assets = { fetch: async (request: Request) => new Response(new URL(request.url).pathname.endsWith(".js") ? "textContent" : "<!doctype html><title>Provider Governance Local</title>", { headers: { "Content-Type": new URL(request.url).pathname.endsWith(".js") ? "text/javascript" : "text/html" } }) };
const localEnv = { LOCAL_DEMO_DB: env.DB, LOCAL_DEMO_MODE: "enabled", ASSETS: assets };
const req = (path: string, init: RequestInit = {}) => new Request(`http://localhost${path}`, init);
let cookie = "", csrf = "";
async function session(fixtureKey = "operator_a") {
  const response = await worker.fetch(req("/local/api/session", { method: "POST", headers: { Origin: "http://localhost", "Content-Type": "application/json" }, body: JSON.stringify({ fixtureKey }) }), localEnv);
  const data = await response.json() as { csrf: string }; cookie = response.headers.get("Set-Cookie")?.split(";")[0] ?? ""; csrf = data.csrf; return response;
}
const get = (path: string, environment = localEnv) => worker.fetch(req(path, { headers: cookie ? { Cookie: cookie } : {} }), environment);
const post = (path: string, body: unknown, headers: Record<string, string> = {}) => worker.fetch(req(path, { method: "POST", headers: { Origin: "http://localhost", "Content-Type": "application/json", Cookie: cookie, "X-Local-CSRF": csrf, ...headers }, body: JSON.stringify(body) }), localEnv);

describe("Local provider readiness and failure drills UI", () => {
  beforeAll(async () => {
    await reset(); await applyD1Migrations(env.DB, [...migrations]);
    for (const statement of env.LOCAL_DEMO_SCHEMA.split(";").map((value) => value.trim()).filter(Boolean)) await env.DB.prepare(statement).run();
    await seedFixture(env.DB); await session();
  });

  it.each([["/local/ai-lab/readiness", "/local/ai-lab/readiness/"], ["/local/ai-lab/drills", "/local/ai-lab/drills/"]])("canonicalizes %s once", async (path, target) => { const first = await get(path); expect(first.status).toBe(307); expect(first.headers.get("Location")).toBe(`http://localhost${target}`); expect((await get(target)).status).toBe(200); });
  it("preserves readiness query strings", async () => expect((await get("/local/ai-lab/readiness?view=blocking")).headers.get("Location")).toBe("http://localhost/local/ai-lab/readiness/?view=blocking"));
  it("shows external providers as not ready and non-executable", async () => { const data = await (await get("/local/api/ai-lab/readiness")).json() as any; expect(data.readiness).toMatchObject({ banner: "NOT PRODUCTION APPROVAL", externalProviderExecutable: false, maximumApprovedState: "approved_for_shadow", assessment: { result: "not_ready" }, providerApiCalled: false, productionStateChanged: false }); expect(JSON.stringify(data)).not.toMatch(/secretValue|apiKey|prompt|completion/i); });
  it("returns fifteen allowlisted deterministic drills", async () => { const data = await (await get("/local/api/ai-lab/drills")).json() as any; expect(data.drills).toHaveLength(15); expect(data.drills.every((item: any) => item.network === "disabled" && item.productionAuthority === false)).toBe(true); });
  it.each(["provider_outage_rollback", "unsafe_output_rollback", "excessive_cost_rollback", "credential_compromise", "deterministic_only_restoration"])("runs %s without authority", async (drill) => { const response = await post("/local/api/ai-lab/drills/run", { drill }); expect(response.status).toBe(200); expect((await response.json() as any).result).toMatchObject({ status: "completed", authority: "none", networkUsed: false, secretUsed: false, productionStateChanged: false }); });
  it("rejects an unallowlisted drill", async () => expect((await post("/local/api/ai-lab/drills/run", { drill: "arbitrary-production-action" })).status).toBe(400));
  it("requires Same-Origin and CSRF for drill mutations", async () => { const noCsrf = await worker.fetch(req("/local/api/ai-lab/drills/run", { method: "POST", headers: { Origin: "http://localhost", "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ drill: "provider_outage_rollback" }) }), localEnv); expect(noCsrf.status).toBe(403); expect((await post("/local/api/ai-lab/drills/run", { drill: "provider_outage_rollback" }, { Origin: "https://evil.invalid" })).status).toBe(403); });
  it("hides platform governance from tenant users", async () => { await session("owner_a"); expect((await get("/local/api/ai-lab/readiness")).status).toBe(403); expect((await get("/local/api/ai-lab/drills")).status).toBe(403); await session(); });
  it("fails readiness and drill routes closed outside local mode", async () => { const outside = { ...localEnv, LOCAL_DEMO_MODE: "production" }; expect((await get("/local/ai-lab/readiness/", outside)).status).toBe(404); expect((await get("/local/api/ai-lab/readiness", outside)).status).toBe(404); });
  it("keeps local health and readiness absent", async () => { expect((await get("/health")).status).toBe(404); expect((await get("/ready")).status).toBe(404); });
});
