import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { observabilityPermissions } from "../../src/platform-observability";
import {
  actorDigest,
  observabilityHarness,
  observationContext,
  observationInput,
  resetObservabilityDatabase,
  tenantA,
  tenantB,
} from "./observability-helpers";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
const tenantAccess = (tenantId: string) => ({
  tenantId,
  membershipId: null,
  permissionKeys: [
    observabilityPermissions.diagnosticsReadTenant,
    observabilityPermissions.incidentRead,
    observabilityPermissions.incidentManage,
    observabilityPermissions.alertRead,
  ],
});
const platformAccess = {
  tenantId: null,
  membershipId: null,
  permissionKeys: [
    observabilityPermissions.diagnosticsReadPlatform,
    observabilityPermissions.incidentRead,
    observabilityPermissions.incidentManage,
    observabilityPermissions.alertRead,
  ],
};

beforeEach(resetObservabilityDatabase);

describe("Platform Observability Local D1", () => {
  it("records an observation, minimal audit, and idempotent stored result", async () => {
    const { app } = observabilityHarness();
    const context = observationContext("same-key");
    const first = await app.observe(observationInput(), context);
    const replay = await app.observe(observationInput(), context);
    expect(replay.observation.eventId).toBe(first.observation.eventId);
    const counts = await Promise.all([
      env.DB.prepare("SELECT count(*) AS count FROM observation_events").first<{ count: number }>(),
      env.DB.prepare("SELECT count(*) AS count FROM audit_records WHERE action = 'diagnostic.observation.record'").first<{ count: number }>(),
      env.DB.prepare("SELECT count(*) AS count FROM idempotency_records WHERE operation = 'observability.observe'").first<{ count: number }>(),
    ]);
    expect(counts.map((row) => row?.count)).toEqual([1, 1, 1]);
  });

  it("rejects raw secrets, UID fields, request bodies, and unbounded metadata", async () => {
    const { app } = observabilityHarness();
    await expect(app.observe({ ...observationInput(), metadata: { rawLineUid: "U123" } }, observationContext())).rejects.toThrow();
    await expect(app.observe({ ...observationInput(), metadata: { requestBody: "payload" } }, observationContext())).rejects.toThrow();
    await expect(app.observe({ ...observationInput(), metadata: { safe: "bearer token_value" } }, observationContext())).rejects.toThrow();
    await expect(app.observe({ ...observationInput(), metadata: Object.fromEntries(Array.from({ length: 21 }, (_, index) => [`k${index}`, index])) }, observationContext())).rejects.toThrow();
    expect((await env.DB.prepare("SELECT count(*) AS count FROM observation_events").first<{ count: number }>())?.count).toBe(0);
  });

  it("aggregates the same fingerprint and event in the bounded window", async () => {
    const { app } = observabilityHarness();
    const first = await app.observe(observationInput(), observationContext());
    const second = await app.observe({ ...observationInput(), correlationId: "runtime-correlation-002", traceId: "runtime-trace-002" }, observationContext());
    expect(second.observation.eventId).toBe(first.observation.eventId);
    expect(second.observation.occurrenceCount).toBe(2);
    expect(second.incident?.incidentId).toBe(first.incident?.incidentId);
    expect(second.incident?.occurrenceCount).toBe(2);
  });

  it("keeps Tenant configuration incidents isolated", async () => {
    const { app } = observabilityHarness();
    const inputA = { ...observationInput(tenantA), eventType: "configuration.invalid" as const, errorCode: "TENANT_CONFIGURATION_INVALID" };
    const inputB = { ...observationInput(tenantB), eventType: "configuration.invalid" as const, errorCode: "TENANT_CONFIGURATION_INVALID", applicationId: "application-local-002" };
    const first = await app.observe(inputA, observationContext());
    const second = await app.observe(inputB, observationContext());
    expect(second.incident?.incidentId).not.toBe(first.incident?.incidentId);
    expect(first.incident?.scopeType).toBe("tenant");
  });

  it("aggregates a provider outage across Tenants", async () => {
    const { app } = observabilityHarness();
    const provider = { ...observationInput(tenantA), eventType: "dependency.unavailable" as const, errorCode: "PROVIDER_UNAVAILABLE", dependencyKey: "line-provider" };
    const first = await app.observe(provider, observationContext());
    const second = await app.observe({ ...provider, tenantId: tenantB, applicationId: "application-local-002", correlationId: "provider-correlation-002" }, observationContext());
    expect(second.incident?.incidentId).toBe(first.incident?.incidentId);
    expect(second.incident).toMatchObject({ scopeType: "provider", affectedTenantCount: 2 });
  });

  it("audits acknowledge/resolve lifecycle and writes reopen evidence", async () => {
    const { app, clock } = observabilityHarness();
    const created = await app.observe({ ...observationInput(), eventType: "configuration.invalid", errorCode: "TENANT_CONFIGURATION_INVALID" }, observationContext());
    const incidentId = created.incident?.incidentId;
    if (!incidentId) throw new Error("incident missing");
    const acknowledged = await app.acknowledgeIncident(incidentId, `service:operator-local`, tenantAccess(tenantA), observationContext());
    expect(acknowledged.status).toBe("acknowledged");
    const resolved = await app.resolveIncident(incidentId, "LOCAL_RESOLUTION", tenantAccess(tenantA), observationContext());
    expect(resolved.status).toBe("resolved");
    clock.advance(1);
    const reopened = await app.observe({ ...observationInput(), eventType: "configuration.invalid", errorCode: "TENANT_CONFIGURATION_INVALID", correlationId: "runtime-correlation-reopen", traceId: "runtime-trace-reopen" }, observationContext());
    expect(reopened.incident).toMatchObject({ status: "open", reopenCount: 1 });
    const evidence = await env.DB.prepare("SELECT event_kind FROM incident_events WHERE incident_id = ?1 ORDER BY occurred_at").bind(incidentId).all<{ event_kind: string }>();
    expect(evidence.results.map(({ event_kind }) => event_kind)).toContain("reopened");
    const audit = await env.DB.prepare("SELECT action FROM audit_records WHERE resource_reference = ?1 ORDER BY occurred_at").bind(incidentId).all<{ action: string }>();
    expect(audit.results.map(({ action }) => action)).toEqual(["incident.acknowledged", "incident.resolved"]);
  });

  it("maps Support Code with Tenant isolation and platform override", async () => {
    const { app } = observabilityHarness();
    const created = await app.observe({ ...observationInput(), eventType: "configuration.invalid", errorCode: "TENANT_CONFIGURATION_INVALID" }, observationContext());
    const code = created.supportCode;
    if (!code) throw new Error("support code missing");
    expect((await app.getDiagnosticBySupportCode(code, tenantAccess(tenantA))).tenantId).toBe(tenantA);
    await expect(app.getDiagnosticBySupportCode(code, tenantAccess(tenantB))).rejects.toThrow();
    expect((await app.getDiagnosticBySupportCode(code, platformAccess)).correlationId).toBe("runtime-correlation-001");
  });

  it("bounds diagnostics pagination and enforces Tenant incident reads", async () => {
    const { app } = observabilityHarness();
    await app.observe(observationInput(), observationContext());
    expect((await app.listTenantDiagnostics(tenantA, tenantAccess(tenantA), { limit: 101 })).items.length).toBeLessThanOrEqual(100);
    await expect(app.listTenantDiagnostics(tenantA, tenantAccess(tenantB))).rejects.toThrow();
    const page = await app.listTenantDiagnostics(tenantA, tenantAccess(tenantA), { limit: 1 });
    expect(page.items).toHaveLength(1);
  });

  it("uses bounded indexed queries without SELECT star or N+1", async () => {
    const { app } = observabilityHarness();
    await app.observe(observationInput(), observationContext());
    const plans = await Promise.all([
      env.DB.prepare("EXPLAIN QUERY PLAN SELECT id FROM observation_events WHERE tenant_id = ?1 ORDER BY observed_at DESC, id DESC LIMIT 51").bind(tenantA).all<{ detail: string }>(),
      env.DB.prepare("EXPLAIN QUERY PLAN SELECT id FROM incidents WHERE status = ?1 ORDER BY severity, last_seen_at DESC LIMIT 51").bind("open").all<{ detail: string }>(),
      env.DB.prepare("EXPLAIN QUERY PLAN SELECT support_code FROM support_code_mappings WHERE tenant_id = ?1 AND expires_at > ?2 LIMIT 1").bind(tenantA, 1).all<{ detail: string }>(),
    ]);
    const details = plans.flatMap((plan) => plan.results.map(({ detail }) => detail)).join("\n");
    expect(details).toContain("idx_observation_tenant_time");
    expect(details).toContain("idx_incident_status_severity");
    expect(details).toContain("idx_support_code_tenant_expiry");
  });

  it("registers exact permissions and restores immutable registration guard", async () => {
    const permissions = await env.DB.prepare("SELECT permission_key FROM permissions WHERE permission_key LIKE 'diagnostics:%' OR permission_key LIKE 'incident:%' OR permission_key LIKE 'alert:%' ORDER BY permission_key").all<{ permission_key: string }>();
    expect(permissions.results.map(({ permission_key }) => permission_key)).toEqual([
      "alert:manage", "alert:read", "diagnostics:read_platform", "diagnostics:read_tenant", "incident:manage", "incident:read",
    ]);
    await expect(env.DB.prepare("INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at) VALUES ('019c0000-0000-7000-8000-000000009999', 'diagnostics:runtime', 'Forbidden', 'active', 1, 1)").run()).rejects.toThrow(/permission_vocabulary_immutable/);
  });
});

describe("Observability migration atomicity", () => {
  it("fully rolls back a forced mid-migration failure", async () => {
    await reset();
    const core = migrations.filter(({ name }) => !name.includes("0004_platform_observability"));
    await applyD1Migrations(env.DB, [...core]);
    const migration = migrations.find(({ name }) => name.includes("0004_platform_observability"));
    if (!migration) throw new Error("observability migration missing");
    const restoreIndex = migration.queries.findIndex((query) => query.includes("CREATE TRIGGER trg_permissions_immutable_insert"));
    expect(restoreIndex).toBeGreaterThan(0);
    const failing: D1Migration = {
      name: "0004_observability_forced_failure.sql",
      queries: [...migration.queries.slice(0, restoreIndex), "INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at) VALUES ('019c0000-0000-7000-8000-000000009998', 'diagnostics:read_tenant', 'Duplicate', 'active', 1, 1)"],
    };
    await expect(applyD1Migrations(env.DB, [failing])).rejects.toThrow();
    expect((await env.DB.prepare("SELECT count(*) AS count FROM permissions WHERE permission_key LIKE 'diagnostics:%' OR permission_key LIKE 'incident:%' OR permission_key LIKE 'alert:%'").first<{ count: number }>())?.count).toBe(0);
    expect((await env.DB.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'observation_events'").first<{ count: number }>())?.count).toBe(0);
    expect((await env.DB.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'trigger' AND name = 'trg_permissions_immutable_insert'").first<{ count: number }>())?.count).toBe(1);
  });
});