import { createLocalWorkbench } from "./composition";
import { UuidV7Generator } from "../core/uuidv7";
import { LocalProviderReadinessService, localProviderGovernanceContext } from "./provider-readiness-service";
import { LocalAiLabService } from "./ai-lab-service";
import {
  aiLabContext,
  parseAiLabSimulation,
  type LocalFixtureKey,
} from "./ai-lab-models";
import { readFixture, seedFixture, type DemoFixtureState } from "./seed";
import {
  assertSafePayload,
  canonicalPath,
  cookieValue,
  digestToken,
  localOnly,
  randomToken,
  sameOrigin,
  sessionCookie,
} from "./security";

interface Env {
  LOCAL_DEMO_DB: D1Database;
  LOCAL_DEMO_MODE?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}
interface SessionRow {
  fixture_key: LocalFixtureKey;
  channel_version: number;
  expires_at: number;
}
const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
const redactFixtureIds = (
  value: unknown,
  fixture: DemoFixtureState,
): unknown => {
  if (typeof value === "string") {
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    )
      return value === fixture.eventReference
        ? "local-demo-event"
        : "local-reference";
    if (value === fixture.eventReference) return "local-demo-event";
    if (
      [
        fixture.tenantA,
        fixture.appA,
        fixture.appB,
        fixture.ownerMembership,
        fixture.memberMembership,
        fixture.operatorMembership,
      ].includes(value)
    )
      return "local-reference";
    return value;
  }
  if (Array.isArray(value))
    return value.map((item) => redactFixtureIds(item, fixture));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        redactFixtureIds(item, fixture),
      ]),
    );
  return value;
};
const contextSummary = (key: SessionRow["fixture_key"]) => ({
  tenant: key === "owner_tenant_b" ? "Tenant B" : "Tenant A",
  application:
    key === "owner_tenant_b"
      ? "Tenant B Application"
      : key === "owner_b"
        ? "Application B"
        : "Application A",
  actor: key,
  roles:
    key === "member_a"
      ? ["local_demo_member"]
      : ["tenant_owner", "local_demo_manager"],
  permissions:
    key === "member_a"
      ? ["conversation:use", "tenant:read", "commission:read_self"]
      : [
          "conversation:use",
          "tenant:update",
          "module_enablement:manage",
          "diagnostics:read_tenant",
          "ai_gateway:invoke",
          "ai_task:read",
          "ai_provider:read",
          "ai_policy:read",
          "ai_budget:read",
          key === "operator_a"
            ? "ai_usage:read_platform"
            : "ai_usage:read_tenant",
        ],
  modules: key === "owner_b" || key === "owner_tenant_b" ? [] : ["event_engine", "business_network_engine"],
  aiLab: {
    mode: "gateway_shadow",
    authority: "deterministic_only",
    externalProviders: "disabled",
  },
});
const safeError = (code: string, status = 400) =>
  json(
    {
      ok: false,
      code,
      message: "此操作未完成，請依畫面提示重試。",
      supportCode: `LOCAL-${randomToken().slice(0, 16).toUpperCase()}`,
    },
    status,
  );
async function body(request: Request): Promise<Record<string, unknown>> {
  const size = Number(request.headers.get("Content-Length") ?? 0);
  if (size > 12_000) throw new TypeError("PAYLOAD_TOO_LARGE");
  const text = await request.text();
  if (text.length > 12_000) throw new TypeError("PAYLOAD_TOO_LARGE");
  const value = JSON.parse(text) as unknown;
  assertSafePayload(value);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError("INPUT_INVALID");
  return value as Record<string, unknown>;
}
async function session(
  request: Request,
  db: D1Database,
): Promise<{ row: SessionRow; token: string } | null> {
  const token = cookieValue(request);
  if (!token) return null;
  const row = await db
    .prepare(
      "SELECT fixture_key,channel_version,expires_at FROM local_demo_sessions WHERE token_digest=?1 AND expires_at>?2",
    )
    .bind(await digestToken(token), Date.now())
    .first<SessionRow>();
  return row ? { row, token } : null;
}
function contextFor(fixture: DemoFixtureState, row: SessionRow) {
  const tenantB = row.fixture_key === "owner_tenant_b";
  const membership = tenantB
    ? fixture.tenantBOwnerMembership
    : row.fixture_key === "member_a"
      ? fixture.memberMembership
      : row.fixture_key === "operator_a"
        ? fixture.operatorMembership
        : fixture.ownerMembership;
  return {
    source: "trusted_runtime_context" as const,
    tenantId: tenantB ? fixture.tenantB : fixture.tenantA,
    applicationId: tenantB
      ? fixture.tenantBApp
      : row.fixture_key === "owner_b"
        ? fixture.appB
        : fixture.appA,
    actorMembershipId: membership,
    channelKey: `local-browser:${row.fixture_key}:${row.channel_version}`,
    correlationId: `local-${crypto.randomUUID()}`,
  };
}
async function requireMutation(request: Request, db: D1Database) {
  if (!sameOrigin(request)) throw new Error("ORIGIN_REJECTED");
  const current = await session(request, db);
  if (!current) throw new Error("SESSION_REQUIRED");
  const csrf = request.headers.get("X-Local-CSRF");
  if (!csrf) throw new Error("CSRF_REJECTED");
  const match = await db
    .prepare(
      "SELECT 1 ok FROM local_demo_sessions WHERE token_digest=?1 AND csrf_digest=?2 AND expires_at>?3",
    )
    .bind(await digestToken(current.token), await digestToken(csrf), Date.now())
    .first();
  if (!match) throw new Error("CSRF_REJECTED");
  return current;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/local/"))
      return new Response("Not Found", { status: 404 });
    if (!localOnly(request, env.LOCAL_DEMO_MODE))
      return new Response("Not Found", { status: 404 });
    const isApiRoute = url.pathname.startsWith("/local/api/");
    const aiLabPage = /^\/local\/ai-lab(?:\/(requests|usage|readiness|drills))?\/*$/.exec(
      url.pathname,
    );
    if (request.method === "GET" && !isApiRoute && aiLabPage) {
      const section = aiLabPage[1];
      const canonical = section
        ? `/local/ai-lab/${section}/`
        : "/local/ai-lab/";
      const target = canonicalPath(url, canonical);
      if (target) return Response.redirect(target.href, 307);
      return env.ASSETS.fetch(request);
    }
    if (request.method === "GET" && !isApiRoute) {
      if (/^\/local\/workbench\/*$/.test(url.pathname)) {
        const target = canonicalPath(url, "/local/workbench/");
        if (target) return Response.redirect(target.href, 307);
        return env.ASSETS.fetch(request);
      }
      if (/^\/local\/setup\/*$/.test(url.pathname)) {
        const target = canonicalPath(url, "/local/setup/");
        if (target) return Response.redirect(target.href, 307);
        const assetUrl = new URL(url);
        assetUrl.pathname = "/local/workbench/setup";
        return env.ASSETS.fetch(new Request(assetUrl, request));
      }
    }
    if (
      request.method === "GET" &&
      !isApiRoute &&
      (url.pathname.startsWith("/local/workbench/") ||
        url.pathname.startsWith("/local/ai-lab/"))
    )
      return env.ASSETS.fetch(request);
    if (request.method === "GET" && url.pathname === "/local/status") {
      try {
        const fixture = await readFixture(env.LOCAL_DEMO_DB);
        return json({
          ok: true,
          mode: "local",
          database: "isolated-local-d1",
          seeded: Boolean(fixture),
          routes: ["/local/setup", "/local/workbench", "/local/ai-lab", "/local/ai-lab/readiness", "/local/ai-lab/drills"],
        });
      } catch {
        return json({
          ok: true,
          mode: "local",
          database: "setup-required",
          seeded: false,
        });
      }
    }
    if (request.method === "POST" && url.pathname === "/local/setup") {
      if (
        !sameOrigin(request) ||
        request.headers.get("X-Local-Setup") !== "confirm"
      )
        return safeError("SETUP_REJECTED", 403);
      try {
        await seedFixture(env.LOCAL_DEMO_DB);
        return json({
          ok: true,
          seeded: true,
          message: "Local fixtures are ready.",
        });
      } catch (error) {
        console.error(
          "local setup failed",
          error instanceof Error ? error.message : "unknown",
        );
        return safeError("SETUP_FAILED", 500);
      }
    }
    if (request.method === "POST" && url.pathname === "/local/api/session") {
      if (!sameOrigin(request)) return safeError("ORIGIN_REJECTED", 403);
      try {
        const data = await body(request),
          key = data.fixtureKey;
        if (
          !(["owner_a", "owner_b", "owner_tenant_b", "member_a", "operator_a"] as const).includes(
            key as never,
          )
        )
          return safeError("FIXTURE_NOT_ALLOWED", 403);
        if (!(await readFixture(env.LOCAL_DEMO_DB)))
          return safeError("SETUP_REQUIRED", 409);
        const token = randomToken(),
          csrf = randomToken(),
          now = Date.now();
        await env.LOCAL_DEMO_DB.prepare(
          "INSERT INTO local_demo_sessions(token_digest,csrf_digest,fixture_key,channel_version,expires_at,created_at) VALUES(?1,?2,?3,1,?4,?5)",
        )
          .bind(
            await digestToken(token),
            await digestToken(csrf),
            key,
            now + 14_400_000,
            now,
          )
          .run();
        return json(
          {
            ok: true,
            csrf,
            actor: key,
            context: contextSummary(key as SessionRow["fixture_key"]),
            trustedContext: "server-resolved",
            expiresInSeconds: 14400,
          },
          200,
          { "Set-Cookie": sessionCookie(token) },
        );
      } catch {
        return safeError("SESSION_FAILED", 400);
      }
    }
    if (
      request.method === "GET" &&
      url.pathname.startsWith("/local/api/ai-lab/")
    ) {
      try {
        const current = await session(request, env.LOCAL_DEMO_DB);
        if (!current) return safeError("SESSION_REQUIRED", 403);
        const fixture = await readFixture(env.LOCAL_DEMO_DB);
        if (!fixture) return safeError("SETUP_REQUIRED", 409);
        const context = aiLabContext(fixture, current.row.fixture_key);
        if (!context.permissionGranted)
          return safeError("AI_PERMISSION_DENIED", 403);
        const lab = new LocalAiLabService(env.LOCAL_DEMO_DB, fixture);
        if (url.pathname === "/local/api/ai-lab/catalog")
          return json({ ok: true, providers: await lab.catalog() });
        if (url.pathname === "/local/api/ai-lab/tasks")
          return json({ ok: true, tasks: await lab.tasks() });
        if (url.pathname === "/local/api/ai-lab/policies")
          return json({ ok: true, policies: await lab.policies(context) });
        if (url.pathname === "/local/api/ai-lab/budgets")
          return json({ ok: true, budgets: await lab.budgets(context) });
        if (url.pathname === "/local/api/ai-lab/readiness" || url.pathname === "/local/api/ai-lab/drills") {
          if (current.row.fixture_key !== "operator_a") return safeError("AI_PROVIDER_GOVERNANCE_DENIED", 403);
          const governance = new LocalProviderReadinessService(env.LOCAL_DEMO_DB, new UuidV7Generator());
          const governanceContext = localProviderGovernanceContext("local-platform-operator");
          return url.pathname.endsWith("/readiness")
            ? json({ ok: true, readiness: await governance.summary(governanceContext) })
            : json({ ok: true, drills: governance.listDrills(governanceContext), banner: "NOT PRODUCTION APPROVAL" });
        }
        if (url.pathname === "/local/api/ai-lab/requests") {
          const beforeValue = Number(url.searchParams.get("before") ?? Date.now() + 1);
          const limitValue = Number(url.searchParams.get("limit") ?? 25);
          const before = Number.isFinite(beforeValue) ? beforeValue : Date.now() + 1;
          const limit = Number.isFinite(limitValue) ? limitValue : 25;
          return json({
            ok: true,
            requests: await lab.listRequests(context, before, limit),
          });
        }
        const detail = /^\/local\/api\/ai-lab\/requests\/([0-9a-f-]{36})$/i.exec(
          url.pathname,
        );
        if (detail) {
          const requestDetail = await lab.requestDetail(context, detail[1] ?? "");
          return requestDetail
            ? json({ ok: true, request: requestDetail })
            : safeError("AI_REQUEST_NOT_FOUND", 404);
        }
        if (url.pathname === "/local/api/ai-lab/usage") {
          const now = Date.now();
          const maximumRange = 90 * 86_400_000;
          const untilValue = Number(url.searchParams.get("until") ?? now + 1);
          const until = Number.isFinite(untilValue) ? Math.min(untilValue, now + 1) : now + 1;
          const fromValue = Number(url.searchParams.get("from") ?? until - 30 * 86_400_000);
          const from = Number.isFinite(fromValue)
            ? Math.max(fromValue, until - maximumRange)
            : until - 30 * 86_400_000;
          if (from >= until) return safeError("DATE_RANGE_INVALID", 400);
          return json({ ok: true, usage: await lab.usage(context, from, until) });
        }
        return new Response("Not Found", { status: 404 });
      } catch (error) {
        return safeError(
          error instanceof Error ? error.message : "AI_LAB_READ_FAILED",
          400,
        );
      }
    }
    if (
      request.method === "POST" &&
      (url.pathname === "/local/api/ai-lab/simulate" ||
        url.pathname === "/local/api/ai-lab/reset" ||
        url.pathname === "/local/api/ai-lab/drills/run")
    ) {
      try {
        const current = await requireMutation(request, env.LOCAL_DEMO_DB);
        const fixture = await readFixture(env.LOCAL_DEMO_DB);
        if (!fixture) return safeError("SETUP_REQUIRED", 409);
        const context = aiLabContext(fixture, current.row.fixture_key);
        if (!context.permissionGranted)
          return safeError("AI_PERMISSION_DENIED", 403);
        const lab = new LocalAiLabService(env.LOCAL_DEMO_DB, fixture);
        if (url.pathname === "/local/api/ai-lab/drills/run") {
          if (current.row.fixture_key !== "operator_a") return safeError("AI_PROVIDER_GOVERNANCE_DENIED", 403);
          const data = await body(request);
          const drill = typeof data.drill === "string" ? data.drill : "";
          const governance = new LocalProviderReadinessService(env.LOCAL_DEMO_DB, new UuidV7Generator());
          return json({ ok: true, result: await governance.runDrill(localProviderGovernanceContext("local-platform-operator"), drill) });
        }
        if (url.pathname === "/local/api/ai-lab/reset") {
          await lab.reset(context);
          return json({
            ok: true,
            reset: "local_ai_lab_evidence",
            immutableUsageRetained: true,
          });
        }
        const simulation = parseAiLabSimulation(await body(request));
        return json({ ok: true, result: await lab.simulate(context, simulation) });
      } catch (error) {
        const code = error instanceof Error ? error.message : "AI_LAB_FAILED";
        return safeError(
          code,
          code === "AI_PERMISSION_DENIED" ||
            code === "ORIGIN_REJECTED" ||
            code === "SESSION_REQUIRED" ||
            code === "CSRF_REJECTED"
            ? 403
            : code === "AI_IDEMPOTENCY_CONFLICT"
              ? 409
              : 400,
        );
      }
    }
    if (
      request.method === "POST" &&
      url.pathname === "/local/api/reset-conversation"
    ) {
      try {
        const current = await requireMutation(request, env.LOCAL_DEMO_DB);
        await env.LOCAL_DEMO_DB.prepare(
          "UPDATE local_demo_sessions SET channel_version=channel_version+1 WHERE token_digest=?1",
        )
          .bind(await digestToken(current.token))
          .run();
        return json({ ok: true });
      } catch (error) {
        return safeError(
          error instanceof Error ? error.message : "RESET_FAILED",
          403,
        );
      }
    }
    if (request.method === "POST" && url.pathname === "/local/api/chat") {
      try {
        const current = await requireMutation(request, env.LOCAL_DEMO_DB),
          fixture = await readFixture(env.LOCAL_DEMO_DB);
        if (!fixture) return safeError("SETUP_REQUIRED", 409);
        const data = await body(request),
          text = typeof data.text === "string" ? data.text : "",
          messageKey =
            typeof data.messageKey === "string" ? data.messageKey : "";
        const rawSlots =
          data.slots &&
          typeof data.slots === "object" &&
          !Array.isArray(data.slots)
            ? (data.slots as Record<string, unknown>)
            : undefined;
        const slots = rawSlots
          ? {
              ...rawSlots,
              ...(rawSlots.event_reference === "fixture:event"
                ? { event_reference: fixture.eventReference }
                : {}),
              ...(rawSlots.support_code === "fixture:support"
                ? { support_code: fixture.supportCode }
                : {}),
            }
          : undefined;
        const workbench = createLocalWorkbench(env.LOCAL_DEMO_DB, fixture);
        const response = await workbench.handle(
          contextFor(fixture, current.row),
          { text, messageKey, ...(slots ? { slots } : {}) },
        );
        return json({
          ok: true,
          response: redactFixtureIds(response, fixture),
          fixtureHints: {
            eventReference: "fixture:event",
            moduleReference: "event_engine",
            supportCode: "fixture:support",
          },
        });
      } catch (error) {
        console.error(
          "local chat failed",
          error instanceof Error ? error.message : "unknown",
        );
        const code = error instanceof Error ? error.message : "CHAT_FAILED";
        return safeError(
          code,
          ["ORIGIN_REJECTED", "SESSION_REQUIRED", "CSRF_REJECTED"].includes(
            code,
          )
            ? 403
            : 400,
        );
      }
    }
    return new Response("Not Found", { status: 404 });
  },
};
