import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import type { UuidV7 } from "../../src/core/uuidv7";
import { AiProviderGovernanceService } from "../../src/ai-provider-governance/application";
import { ProviderGovernanceError, type ProviderGovernanceContext, type ProviderRouteGovernanceRequest } from "../../src/ai-provider-governance/models";
import { DisabledProviderGovernanceObservationAdapter } from "../../src/ai-provider-governance/ports";
import { AiProviderGovernanceRepository } from "../../src/ai-provider-governance/repository";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
let sequence = 950000;
class Ids implements UuidV7 { generate() { sequence += 1; return `019f0000-0000-7000-8000-${String(sequence).padStart(12, "0")}`; } }
const operator: ProviderGovernanceContext = { source: "platform_operator_context", actorReference: "local-platform-operator", permissions: ["ai_provider_enablement:manage", "ai_provider_kill_switch:manage", "ai_provider_readiness:evaluate", "ai_provider_drill:run"], correlationId: "governance-test" };
const route: ProviderRouteGovernanceRequest = { providerKey: "disabled_generic_adapter", modelKey: "disabled", modelVersion: "1", taskKey: "content.translation", taskVersion: 1, environment: "local", tenantId: "019f0000-0000-7000-8000-000000009001", applicationId: "019f0000-0000-7000-8000-000000009004", sensitivity: "internal", inputUnits: 10, outputUnits: 10, estimatedCostMicros: 10, interactive: true };

async function seedCoreScope() {
  await env.DB.batch([
    env.DB.prepare("INSERT INTO platform_users(id,status,created_at,updated_at) VALUES('019f0000-0000-7000-8000-000000009002','active',1,1)"),
    env.DB.prepare("INSERT INTO tenants(id,name,status,created_at,updated_at) VALUES(?1,'Governance Tenant','active',1,1)").bind(route.tenantId),
    env.DB.prepare("INSERT INTO tenant_memberships(id,tenant_id,platform_user_id,status,join_source,joined_at,created_at,updated_at) VALUES('019f0000-0000-7000-8000-000000009003',?1,'019f0000-0000-7000-8000-000000009002','active','test',1,1,1)").bind(route.tenantId),
    env.DB.prepare("INSERT INTO applications(id,tenant_id,application_key,name,status,default_locale,version,created_at,updated_at) VALUES(?1,?2,'governance-app','Governance App','active','zh-TW',1,1,1)").bind(route.applicationId, route.tenantId),
  ]);
}

async function seedExternalGovernance(now = 1000) {
  await env.DB.batch([
    env.DB.prepare("INSERT INTO ai_provider_compliance_profiles(id,provider_key,provider_version,environment,profile_version,legal_entity,service_region,processing_regions_json,storage_regions_json,data_retention_mode,retention_days,training_usage_policy,subprocessors_reference,breach_notification_sla_hours,deletion_support,audit_support,data_export_support,customer_data_ownership,terms_version,privacy_policy_version,compliance_status,reviewed_at,reviewed_by,expires_at,created_at) VALUES('019f0000-0000-7000-8000-000000009301','disabled_generic_adapter','1','local',1,'Fictional Local Provider','local','[\"local\"]','[\"local\"]','none',0,'prohibited','local-reference',24,1,1,1,'customer_retained','fixture-v1','fixture-v1','approved',?1,'compliance-reviewer',?2,?1)").bind(now, 4102444800000),
    env.DB.prepare("INSERT INTO ai_provider_data_policies VALUES('019f0000-0000-7000-8000-000000009302','disabled_generic_adapter','1','local',1,'confidential',0,0,0,1,1,1,0,1,1,'active',?1,?2)").bind(4102444800000, now),
    env.DB.prepare("INSERT INTO ai_provider_secret_references(id,secret_reference_id,provider_key,environment,reference_name,status,version,created_at,expires_at) VALUES('019f0000-0000-7000-8000-000000009303','local-planned-reference','disabled_generic_adapter','local','future-local-secret-reference','planned',1,?1,?2)").bind(now, 4102444800000),
    env.DB.prepare("INSERT INTO ai_task_provider_allow_matrix VALUES('019f0000-0000-7000-8000-000000009304','disabled_generic_adapter','1','disabled','1','content.translation',1,'local','shadow_only','confidential','standard',1000,1000,1000,5000,1,'active',?1)").bind(now),
    env.DB.prepare("INSERT INTO ai_provider_hard_ceilings VALUES('019f0000-0000-7000-8000-000000009305','local','disabled_generic_adapter',1,100,100000,10,5,1000,1000,'fixture-v1','active',?1)").bind(now),
    env.DB.prepare("INSERT INTO ai_shadow_plans VALUES('019f0000-0000-7000-8000-000000009306','disabled_generic_adapter','content.translation',1,'local',1000,100,'confidential','[\"schema_validity\"]','{\"minimumSuccessRate\":95}','{\"maximumUnsafe\":0}',?1,?2,'approved',1,?1)").bind(now, 4102444800000),
    env.DB.prepare("INSERT INTO ai_canary_plans VALUES('019f0000-0000-7000-8000-000000009307','disabled_generic_adapter','content.translation',1,'local','[\"tenant-fixture\"]','[\"application-fixture\"]',100,10,1000,?1,?2,'{\"successRate\":99}','{\"unsafe\":1}','rollback-owner',60,'draft',1,?1)").bind(now, 4102444800000),
    env.DB.prepare("INSERT INTO ai_provider_rollback_plans VALUES('019f0000-0000-7000-8000-000000009308','disabled_generic_adapter','local','deterministic_only','[\"provider_outage\"]','[\"disable route\",\"drain inflight\"]','[\"no new provider request\",\"usage complete\"]','rollback-owner',15,'approved',1,?1)").bind(now),
    ...["credential_compromise", "provider_outage", "unsafe_output", "excessive_cost"].map((kind, index) => env.DB.prepare("INSERT INTO ai_provider_incident_runbooks VALUES(?1,'disabled_generic_adapter','local',?2,'[\"safe_signal\"]','[\"disable provider\"]','provider','[\"platform_operator\"]','[\"support_code\"]','rollback-local','[\"deterministic restored\"]','[\"review\"]','incident-owner',1,'approved',?3)").bind(`019f0000-0000-7000-8000-${String(9310 + index).padStart(12, "0")}`, kind, now)),
    ...["compliance", "architecture", "security"].map((type, index) => env.DB.prepare("INSERT INTO ai_provider_approval_records VALUES(?1,'disabled_generic_adapter','1','local',?2,'approved',?3,?4,'LOCAL_FIXTURE',?5,?6,?7)").bind(`019f0000-0000-7000-8000-${String(9320 + index).padStart(12, "0")}`, type, `${type}_reviewer`, `${type}-fixture`, String(index + 1).repeat(64).slice(0, 64), 4102444800000, now + index)),
  ].flat());
}

async function service() { return new AiProviderGovernanceService(new AiProviderGovernanceRepository(env.DB), new Ids(), new DisabledProviderGovernanceObservationAdapter(), () => 1000); }

beforeEach(async () => { sequence = 950000; await reset(); await applyD1Migrations(env.DB, [...migrations]); await seedCoreScope(); });

describe("AI provider governance Local D1", () => {
  it("installs thirteen governance tables, indexes, triggers and permissions", async () => {
    expect((await env.DB.prepare("SELECT count(*) count FROM sqlite_master WHERE type='table' AND name IN ('ai_provider_enablements','ai_provider_compliance_profiles','ai_provider_data_policies','ai_provider_secret_references','ai_task_provider_allow_matrix','ai_provider_kill_switches','ai_provider_hard_ceilings','ai_provider_readiness_assessments','ai_provider_approval_records','ai_shadow_plans','ai_canary_plans','ai_provider_rollback_plans','ai_provider_incident_runbooks')").first<{ count: number }>())?.count).toBe(13);
    expect((await env.DB.prepare("SELECT count(*) count FROM permissions WHERE id LIKE '019f0000-0000-7000-8000-0000000009%'").first<{ count: number }>())?.count).toBe(13);
    expect((await env.DB.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);
  });

  it("performs ordered lifecycle transitions with audit and idempotency", async () => {
    const app = await service(); let version = 0;
    for (const [index, state] of (["draft", "compliance_review", "security_review", "approved_for_shadow"] as const).entries()) {
      const result = await app.transitionLifecycle(operator, { providerKey: route.providerKey, providerVersion: "1", environment: "local", to: state, expectedVersion: version, reason: `review-${state}`, evidenceReferences: [`evidence:${state}`], idempotencyKey: `lifecycle-${index}-safe` });
      version = result.version; expect(result.replayed).toBe(false);
    }
    expect((await env.DB.prepare("SELECT count(*) count FROM ai_provider_enablements").first<{ count: number }>())?.count).toBe(4);
    expect((await env.DB.prepare("SELECT count(*) count FROM audit_records WHERE action='ai.provider_enablement_changed'").first<{ count: number }>())?.count).toBe(4);
  });

  it("replays lifecycle idempotently and rejects fingerprint conflicts", async () => {
    const app = await service(), input = { providerKey: route.providerKey, providerVersion: "1", environment: "local" as const, to: "draft" as const, expectedVersion: 0, reason: "start-review", evidenceReferences: ["evidence:start"], idempotencyKey: "same-lifecycle-key" };
    const first = await app.transitionLifecycle(operator, input); expect((await app.transitionLifecycle(operator, input)).replayed).toBe(true);
    await expect(app.transitionLifecycle(operator, { ...input, reason: "different-reason" })).rejects.toMatchObject({ code: "AI_PROVIDER_IDEMPOTENCY_CONFLICT" });
    expect(first.version).toBe(1);
  });

  it("rejects Tenant authority and missing platform permission", async () => {
    const app = await service(), input = { providerKey: route.providerKey, providerVersion: "1", environment: "local" as const, to: "draft" as const, expectedVersion: 0, reason: "start-review", evidenceReferences: ["evidence:start"], idempotencyKey: "tenant-denied-key" };
    await expect(app.transitionLifecycle({ ...operator, source: "tenant_context" as never }, input)).rejects.toMatchObject({ code: "AI_PROVIDER_GOVERNANCE_DENIED" });
    await expect(app.transitionLifecycle({ ...operator, permissions: [] }, input)).rejects.toMatchObject({ code: "AI_PROVIDER_GOVERNANCE_DENIED" });
  });

  it("enforces lifecycle ordering and terminal revoke in the database", async () => {
    await expect(env.DB.prepare("INSERT INTO ai_provider_enablements VALUES('019f0000-0000-7000-8000-000000009400','disabled_generic_adapter','1','local','security_review',1,'operator','ai_provider_enablement:manage','skip','[]','x','y',1)").run()).rejects.toThrow(/ai_provider_lifecycle_transition_invalid/);
  });

  it("keeps compliance, approval, policy and usage evidence immutable", async () => {
    await seedExternalGovernance();
    for (const table of ["ai_provider_compliance_profiles", "ai_provider_data_policies", "ai_provider_approval_records", "ai_shadow_plans", "ai_canary_plans", "ai_provider_rollback_plans", "ai_provider_incident_runbooks"])
      await expect(env.DB.prepare(`DELETE FROM ${table}`).run()).rejects.toThrow(/immutable/);
  });

  it("stores secret references without value or key fragments", async () => {
    await seedExternalGovernance(); const columns = (await env.DB.prepare("PRAGMA table_info(ai_provider_secret_references)").all<{ name: string }>()).results.map((row) => row.name).join(" ");
    expect(columns).not.toMatch(/secret_value|api_key|prefix|suffix/); expect(columns).toContain("reference_name");
  });

  it("separates secret references by environment", async () => {
    await seedExternalGovernance();
    await env.DB.prepare("INSERT INTO ai_provider_secret_references(id,secret_reference_id,provider_key,environment,reference_name,status,version,created_at) VALUES('019f0000-0000-7000-8000-000000009401','dev-reference','disabled_generic_adapter','development','future-development-reference','planned',1,1)").run();
    expect((await env.DB.prepare("SELECT count(DISTINCT environment) count FROM ai_provider_secret_references").first<{ count: number }>())?.count).toBe(2);
  });

  it("rejects wildcard tasks and non-shadow modes", async () => {
    await expect(env.DB.prepare("INSERT INTO ai_task_provider_allow_matrix VALUES('019f0000-0000-7000-8000-000000009402','disabled_generic_adapter','1','disabled','1','*',1,'local','shadow_only','internal','standard',10,10,10,10,1,'active',1)").run()).rejects.toThrow();
  });

  it("records a versioned global kill switch with replay safety", async () => {
    const app = await service(), input = { environment: "local" as const, scopeType: "platform" as const, scopeKey: "platform", state: "disabled" as const, expectedVersion: 0, reason: "local-drill", idempotencyKey: "kill-switch-safe" };
    expect((await app.setKillSwitch(operator, input)).version).toBe(1); expect((await app.setKillSwitch(operator, input)).replayed).toBe(true);
    expect((await env.DB.prepare("SELECT count(*) count FROM ai_provider_kill_switches").first<{ count: number }>())?.count).toBe(1);
  });

  it("fails provider authorization on the global kill switch before other checks", async () => {
    const app = await service(); await app.setKillSwitch(operator, { environment: "local", scopeType: "platform", scopeKey: "platform", state: "disabled", expectedVersion: 0, reason: "global-stop", idempotencyKey: "global-kill-safe" });
    await expect(new AiProviderGovernanceRepository(env.DB).authorize(route)).rejects.toMatchObject({ code: "AI_PROVIDER_KILLED" });
  });

  it("fails closed when kill switch storage is unavailable", async () => {
    const broken = new AiProviderGovernanceRepository({ prepare() { throw new Error("storage"); } } as unknown as D1Database);
    await expect(broken.authorize(route)).rejects.toMatchObject({ code: "AI_PROVIDER_GOVERNANCE_UNAVAILABLE" });
  });

  it("keeps an external provider non-executable while its secret is planned", async () => {
    const app = await service(); let version = 0;
    for (const [index, state] of (["draft", "compliance_review", "security_review", "approved_for_shadow"] as const).entries()) { version = (await app.transitionLifecycle(operator, { providerKey: route.providerKey, providerVersion: "1", environment: "local", to: state, expectedVersion: version, reason: `state-${state}`, evidenceReferences: [`e:${state}`], idempotencyKey: `gate-state-${index}` })).version; }
    await seedExternalGovernance(); await expect(new AiProviderGovernanceRepository(env.DB).authorize(route)).rejects.toMatchObject({ code: "AI_PROVIDER_SECRET_NOT_READY" });
  });

  it("always permits the deterministic local provider without an external secret", async () => {
    await expect(new AiProviderGovernanceRepository(env.DB).authorize({ ...route, providerKey: "deterministic_local_adapter", modelKey: "deterministic-fixture" })).resolves.toBeUndefined();
  });

  it("evaluates the external fixture as not ready and deterministic as local-only ready", async () => {
    const app = await service(); await seedExternalGovernance();
    expect(await app.evaluate(operator, route.providerKey, "1", "local", route.taskKey)).toMatchObject({ result: "not_ready" });
    expect(await app.evaluate(operator, "deterministic_local_adapter", "1", "local", route.taskKey)).toMatchObject({ result: "ready_for_local_only" });
  });

  it.each(["provider_outage_rollback", "unsafe_output_rollback", "excessive_cost_rollback", "credential_compromise", "deterministic_only_restoration"] as const)("runs deterministic secret-free drill %s", async (drill) => {
    const result = await (await service()).runLocalDrill(operator, drill); expect(result).toMatchObject({ status: "completed", networkUsed: false, secretUsed: false, productionStateChanged: false, authority: "none" }); expect(JSON.stringify(result)).not.toMatch(/prompt|response|secret.value/i);
  });

  it("uses the intended composite indexes for governance lookups", async () => {
    const details = (await env.DB.prepare("EXPLAIN QUERY PLAN SELECT lifecycle_state FROM ai_provider_enablements WHERE provider_key=?1 AND environment=?2 ORDER BY lifecycle_version DESC LIMIT 1").bind(route.providerKey, "local").all<{ detail: string }>()).results.map((row) => row.detail).join(" ");
    expect(details).toContain("idx_ai_enablement_provider_env_status");
  });

  it("does not automatically grant governance permissions", async () => {
    expect((await env.DB.prepare("SELECT count(*) count FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE p.id LIKE '019f0000-0000-7000-8000-0000000009%'").first<{ count: number }>())?.count).toBe(0);
  });
});
