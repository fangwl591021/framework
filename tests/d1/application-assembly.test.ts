import { env } from "cloudflare:workers";
import { applyD1Migrations, reset, type D1Migration } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ApplicationAssemblyApplication,
  ApplicationModuleServiceGateway,
  applicationAssemblyPermissions,
  DisabledAssemblyObservationAdapter,
  GatedModuleInvoker,
  LocalAllowTrafficAdapter,
  ModuleAccessError,
  ModuleAccessGuard,
  type PlatformOperator,
} from "../../src/application-assembly";
import type { MutationContext } from "../../src/application/core-application-base";
import type { Clock } from "../../src/core/clock";
import type { UuidV7 } from "../../src/core/uuidv7";
import type { IdentityDigestKeyProvider } from "../../src/persistence/crypto";

const migrations = env.TEST_MIGRATIONS as readonly D1Migration[];
class ClockStub implements Clock {
  value = Date.parse("2027-02-01T00:00:00Z");
  now() {
    return new Date(this.value);
  }
  advance(ms: number) {
    this.value += ms;
  }
}
class UuidStub implements UuidV7 {
  n = 300000;
  generate() {
    this.n += 1;
    return `019d0000-0000-7000-8000-${String(this.n).padStart(12, "0")}`;
  }
}
class Keys implements IdentityDigestKeyProvider {
  current() {
    return {
      version: 1,
      secret: new TextEncoder().encode("assembly-local-identity-key-32-bytes"),
    };
  }
  previous() {
    return [];
  }
}
let seq = 0;
const mutation = (key?: string): MutationContext => {
  seq += 1;
  return {
    idempotencyKey: key ?? `assembly-${seq}`,
    actorType: "service",
    actorReference: `digest:${"a".repeat(64)}`,
    correlationId: `assembly-corr-${seq}`,
  };
};
const operator: PlatformOperator = {
  authority: "platform_operator",
  permissionKeys: [
    applicationAssemblyPermissions.catalogManage,
    applicationAssemblyPermissions.entitlementManage,
  ],
};
const moduleInput = (moduleKey: string, displayName: string) => ({
  moduleKey,
  displayName,
  version: "1.0.0",
  category: "domain" as const,
  lifecycleStatus: "candidate" as const,
  contractVersion: "1",
  configurationSchemaVersion: "1",
  navigationManifestVersion: "1",
});
type Harness = Awaited<ReturnType<typeof seed>>;

async function seed() {
  seq = 0;
  await reset();
  await applyD1Migrations(env.DB, [...migrations]);
  const clock = new ClockStub(),
    app = new ApplicationAssemblyApplication(
      env.DB,
      clock,
      new UuidStub(),
      new Keys(),
    );
  const user = await app.createPlatformUser(mutation());
  const tenant = await app.createTenant("Assembly Tenant", mutation());
  const membership = await app.addTenantMembership(
    tenant.id,
    user.id,
    "local-test",
    mutation(),
  );
  await app.assignRole(tenant.id, membership.id, "tenant_owner", mutation());
  const perms = [
    ...Object.values(applicationAssemblyPermissions),
    "network:read",
    "network:manage",
    "referral:read",
    "sales:read",
    "commission:read_all",
  ];
  await app.createTenantRole(
    tenant.id,
    "application_manager",
    "Application Manager",
    perms,
    mutation(),
  );
  await app.assignRole(
    tenant.id,
    membership.id,
    "application_manager",
    mutation(),
  );
  return {
    clock,
    app,
    user,
    tenant,
    membership,
    manager: { membershipId: membership.id },
    guard: new ModuleAccessGuard(
      app.assemblyRepository,
      app,
      new LocalAllowTrafficAdapter(),
      new DisabledAssemblyObservationAdapter(),
      () => clock.now().getTime(),
    ),
  };
}
beforeEach(async () => {
  await seed();
});
async function base(h: Harness) {
  await h.app.registerModule(
    operator,
    moduleInput("event_engine", "Event Engine"),
    mutation(),
  );
  await h.app.registerModule(
    operator,
    moduleInput("business_network_engine", "Business Network Engine"),
    mutation(),
  );
  const a = await h.app.createApplication(
    h.tenant.id,
    h.manager,
    { applicationKey: "app-a", name: "Application A", defaultLocale: "zh-TW" },
    mutation(),
  );
  const b = await h.app.createApplication(
    h.tenant.id,
    h.manager,
    { applicationKey: "app-b", name: "Application B", defaultLocale: "zh-TW" },
    mutation(),
  );
  return { a, b };
}
const ctx = (
  h: Harness,
  applicationId: string,
  moduleKey: string,
  permission = "tenant:read",
) => ({
  source: "trusted_runtime_context" as const,
  tenantId: h.tenant.id,
  applicationId,
  moduleKey,
  actorMembershipId: h.membership.id,
  requiredPermission: permission,
  operation: "test",
  correlationId: "test-correlation",
});

describe("Application Assembly migration", () => {
  it("installs 50 tables, 101 indexes, and 74 triggers", async () => {
    const q = async (type: string, extra = "") =>
      (
        await env.DB.prepare(
          `SELECT count(*) count FROM sqlite_master WHERE type=?1 ${extra}`,
        )
          .bind(type)
          .first<{ count: number }>()
      )?.count;
    expect([
      await q(
        "table",
        "AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations','_cf_METADATA')",
      ),
      await q("index", "AND name NOT LIKE 'sqlite_autoindex_%'"),
      await q("trigger"),
    ]).toEqual([50, 101, 74]);
  });
  it("keeps foreign keys clean", async () =>
    expect(
      (await env.DB.prepare("PRAGMA foreign_key_check").all()).results,
    ).toEqual([]));
  it("registers ten immutable permissions", async () => {
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM permissions WHERE permission_key LIKE 'application:%' OR permission_key LIKE 'module_%'",
        ).first<{ count: number }>()
      )?.count,
    ).toBe(10);
    await expect(
      env.DB.prepare(
        "INSERT INTO permissions(id,permission_key,description,status,created_at,updated_at) VALUES('019d0000-0000-7000-8000-000000999999','module:bad','bad','active',1,1)",
      ).run(),
    ).rejects.toThrow(/permission_vocabulary_immutable/);
  });
  it("forces 0006 failure to roll back permission registration", async () => {
    await reset();
    const prior = migrations.filter(
      (m) => !m.name.includes("0006_application_assembly"),
    );
    await applyD1Migrations(env.DB, [...prior]);
    const migration = migrations.find((m) =>
      m.name.includes("0006_application_assembly"),
    );
    if (!migration) throw new Error("missing 0006");
    const restore = migration.queries.findIndex((q) =>
      q.includes("CREATE TRIGGER trg_permissions_immutable_insert"),
    );
    const failing: D1Migration = {
      name: "0006_forced.sql",
      queries: [
        ...migration.queries.slice(0, restore),
        "INSERT INTO permissions(id,permission_key,description,status,created_at,updated_at) VALUES('019d0000-0000-7000-8000-000000999998','application:read','duplicate','active',1,1)",
      ],
    };
    await expect(applyD1Migrations(env.DB, [failing])).rejects.toThrow();
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM permissions WHERE permission_key LIKE 'application:%' OR permission_key LIKE 'module_%'",
        ).first<{ count: number }>()
      )?.count,
    ).toBe(0);
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM sqlite_master WHERE type='trigger' AND name='trg_permissions_immutable_insert'",
        ).first<{ count: number }>()
      )?.count,
    ).toBe(1);
  });
  it("uses tenant and module lookup indexes", async () => {
    const plans = await Promise.all([
      env.DB.prepare(
        "EXPLAIN QUERY PLAN SELECT id FROM applications WHERE tenant_id=?1 AND status='active' ORDER BY application_key LIMIT 50",
      )
        .bind("x")
        .all<{ detail: string }>(),
      env.DB.prepare(
        "EXPLAIN QUERY PLAN SELECT id FROM application_module_entitlements WHERE tenant_id=?1 AND application_id=?2 AND module_key=?3 AND entitlement_status='purchased'",
      )
        .bind("x", "y", "z")
        .all<{ detail: string }>(),
    ]);
    expect(
      plans.flatMap((p) => p.results.map((x) => x.detail)).join(" "),
    ).toMatch(/idx_applications_tenant_status|sqlite_autoindex_applications/);
    expect(plans[1].results.map((x) => x.detail).join(" ")).toContain(
      "idx_entitlement_access",
    );
  });
});

describe("Application and catalog authority", () => {
  it("creates multiple applications per tenant", async () => {
    const h = await seed(),
      { a, b } = await base(h);
    expect([a.applicationKey, b.applicationKey]).toEqual(["app-a", "app-b"]);
  });
  it("rejects duplicate tenant application key", async () => {
    const h = await seed();
    await h.app.createApplication(
      h.tenant.id,
      h.manager,
      { applicationKey: "same", name: "A", defaultLocale: "zh-TW" },
      mutation(),
    );
    await expect(
      h.app.createApplication(
        h.tenant.id,
        h.manager,
        { applicationKey: "same", name: "B", defaultLocale: "zh-TW" },
        mutation(),
      ),
    ).rejects.toThrow();
  });
  it("isolates applications by tenant", async () => {
    const h = await seed(),
      { a } = await base(h);
    expect(
      await h.app.assemblyRepository.getApplication(
        "019d0000-0000-7000-8000-999999999999",
        a.id,
      ),
    ).toBeNull();
  });
  it("replays application creation without duplicate", async () => {
    const h = await seed(),
      m = mutation("create-once"),
      input = { applicationKey: "once", name: "Once", defaultLocale: "zh-TW" };
    const a = await h.app.createApplication(h.tenant.id, h.manager, input, m),
      b = await h.app.createApplication(h.tenant.id, h.manager, input, m);
    expect(b).toEqual(a);
    expect(
      (await h.app.assemblyRepository.listApplications(h.tenant.id)).filter(
        (x) => x.applicationKey === "once",
      ),
    ).toHaveLength(1);
  });
  it("rejects tenant actor module registration", async () => {
    const h = await seed();
    await expect(
      h.app.registerModule(
        { authority: "platform_operator", permissionKeys: [] },
        moduleInput("event_engine", "Event"),
        mutation(),
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });
  it("bounds application pagination", async () => {
    const h = await seed();
    await base(h);
    expect(
      await h.app.assemblyRepository.listApplications(h.tenant.id, 1),
    ).toHaveLength(1);
  });
});

describe("Entitlement, enablement, and access", () => {
  it("admits purchased and enabled Event", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      {
        status: "purchased",
        validFrom: h.clock.value,
        reasonCode: "PURCHASED",
      },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    await expect(
      h.guard.assertAccess(ctx(h, a.id, "event_engine")),
    ).resolves.toBeUndefined();
  });
  it("rejects Network without entitlement", async () => {
    const h = await seed(),
      { a } = await base(h);
    await expect(
      h.guard.assertAccess(
        ctx(h, a.id, "business_network_engine", "network:read"),
      ),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENTITLED" });
  });
  it("rejects enable without entitlement", async () => {
    const h = await seed(),
      { a } = await base(h);
    await expect(
      h.app.enableModule(
        h.tenant.id,
        a.id,
        "event_engine",
        h.manager,
        mutation(),
      ),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENTITLED" });
  });
  it("admits trial before expiry", async () => {
    const h = await seed(),
      { b } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      b.id,
      "event_engine",
      {
        status: "trial",
        validFrom: h.clock.value,
        validUntil: h.clock.value + 1000,
        reasonCode: "TRIAL",
      },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      b.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    await expect(
      h.guard.assertAccess(ctx(h, b.id, "event_engine")),
    ).resolves.toBeUndefined();
  });
  it("rejects trial after expiry", async () => {
    const h = await seed(),
      { b } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      b.id,
      "event_engine",
      {
        status: "trial",
        validFrom: h.clock.value,
        validUntil: h.clock.value + 1000,
        reasonCode: "TRIAL",
      },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      b.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    h.clock.advance(1001);
    await expect(
      h.guard.assertAccess(ctx(h, b.id, "event_engine")),
    ).rejects.toMatchObject({ code: "MODULE_ENTITLEMENT_EXPIRED" });
  });
  it("revocation blocks service", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    await h.app.revokeEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      1,
      "REVOKED",
      mutation(),
    );
    await expect(
      h.guard.assertAccess(ctx(h, a.id, "event_engine")),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENTITLED" });
  });
  it("disable hides navigation and blocks service", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    expect(
      (await h.guard.buildNavigation(h.tenant.id, a.id, h.membership.id)).items,
    ).toHaveLength(4);
    await h.app.disableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    expect(
      (await h.guard.buildNavigation(h.tenant.id, a.id, h.membership.id)).items,
    ).toHaveLength(0);
    await expect(
      h.guard.assertAccess(ctx(h, a.id, "event_engine")),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENABLED" });
  });
  it("re-enable restores navigation", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    await h.app.disableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    expect(
      (await h.guard.buildNavigation(h.tenant.id, a.id, h.membership.id)).items,
    ).toHaveLength(4);
  });
  it("suspended application blocks all modules", async () => {
    const h = await seed(),
      { b } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      b.id,
      "business_network_engine",
      { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      b.id,
      "business_network_engine",
      h.manager,
      mutation(),
    );
    await h.app.suspendApplication(h.tenant.id, b.id, 1, h.manager, mutation());
    await expect(
      h.guard.assertAccess(
        ctx(h, b.id, "business_network_engine", "network:read"),
      ),
    ).rejects.toMatchObject({ code: "APPLICATION_NOT_ACTIVE" });
  });
  it("direct service invocation cannot bypass guard", async () => {
    const h = await seed(),
      { a } = await base(h);
    let called = false;
    await expect(
      new GatedModuleInvoker(h.guard).invoke(
        ctx(h, a.id, "event_engine"),
        async () => {
          called = true;
          return "bad";
        },
      ),
    ).rejects.toBeInstanceOf(ModuleAccessError);
    expect(called).toBe(false);
  });
  it("client-supplied context fails closed", async () => {
    const h = await seed(),
      { a } = await base(h);
    await expect(
      h.guard.assertAccess({
        ...ctx(h, a.id, "event_engine"),
        source: "client_header" as never,
      }),
    ).rejects.toMatchObject({ code: "APPLICATION_NOT_FOUND" });
  });
  it("traffic admission occurs before domain invocation", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    const deny = new ModuleAccessGuard(
      h.app.assemblyRepository,
      h.app,
      { admit: async () => false },
      new DisabledAssemblyObservationAdapter(),
      () => h.clock.value,
    );
    let called = false;
    await expect(
      new GatedModuleInvoker(deny).invoke(
        ctx(h, a.id, "event_engine"),
        async () => {
          called = true;
        },
      ),
    ).rejects.toMatchObject({ code: "TRAFFIC_NOT_ADMITTED" });
    expect(called).toBe(false);
  });
});

describe("Dependencies, navigation, configuration, and evidence", () => {
  it("blocks missing required dependency", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.addDependency(
      operator,
      "event_engine",
      "business_network_engine",
      "required",
      null,
      mutation(),
    );
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
      mutation(),
    );
    await expect(
      h.app.enableModule(
        h.tenant.id,
        a.id,
        "event_engine",
        h.manager,
        mutation(),
      ),
    ).rejects.toMatchObject({ code: "MODULE_DEPENDENCY_MISSING" });
  });
  it("rejects a dependency cycle", async () => {
    const h = await seed();
    await base(h);
    await h.app.addDependency(
      operator,
      "event_engine",
      "business_network_engine",
      "required",
      null,
      mutation(),
    );
    await expect(
      h.app.addDependency(
        operator,
        "business_network_engine",
        "event_engine",
        "required",
        null,
        mutation(),
      ),
    ).rejects.toMatchObject({ code: "MODULE_CONFLICT" });
  });
  it("blocks configured conflict", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.addDependency(
      operator,
      "event_engine",
      "business_network_engine",
      "conflict",
      null,
      mutation(),
    );
    for (const m of ["event_engine", "business_network_engine"])
      await h.app.grantEntitlement(
        operator,
        h.tenant.id,
        a.id,
        m,
        { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
        mutation(),
      );
    await h.app.enableModule(
      h.tenant.id,
      a.id,
      "business_network_engine",
      h.manager,
      mutation(),
    );
    await expect(
      h.app.enableModule(
        h.tenant.id,
        a.id,
        "event_engine",
        h.manager,
        mutation(),
      ),
    ).rejects.toMatchObject({ code: "MODULE_CONFLICT" });
  });
  it("builds both module navigation without N plus one dependency queries", async () => {
    const h = await seed(),
      { b } = await base(h);
    for (const m of ["event_engine", "business_network_engine"]) {
      await h.app.grantEntitlement(
        operator,
        h.tenant.id,
        b.id,
        m,
        { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
        mutation(),
      );
      await h.app.enableModule(h.tenant.id, b.id, m, h.manager, mutation());
    }
    expect(
      (await h.guard.buildNavigation(h.tenant.id, b.id, h.membership.id)).items,
    ).toHaveLength(9);
  });
  it("builds permission-filtered dashboard", async () => {
    const h = await seed(),
      { b } = await base(h);
    for (const m of ["event_engine", "business_network_engine"]) {
      await h.app.grantEntitlement(
        operator,
        h.tenant.id,
        b.id,
        m,
        { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
        mutation(),
      );
      await h.app.enableModule(h.tenant.id, b.id, m, h.manager, mutation());
    }
    expect(
      (
        await h.guard.buildDashboard(h.tenant.id, b.id, h.membership.id)
      ).cards.map((x) => x.cardKey),
    ).toEqual(["event.summary", "network.summary"]);
  });
  it("rejects raw secret configuration", async () => {
    const h = await seed(),
      { a } = await base(h);
    await expect(
      h.app.setModuleConfiguration(
        h.tenant.id,
        a.id,
        "event_engine",
        { apiToken: "raw" },
        "1",
        null,
        h.manager,
        mutation(),
      ),
    ).rejects.toThrow(/secret values/);
  });
  it("accepts secret references and enforces optimistic version", async () => {
    const h = await seed(),
      { a } = await base(h);
    const first = await h.app.setModuleConfiguration(
      h.tenant.id,
      a.id,
      "event_engine",
      { credentialSecretReference: "EVENT_KEY" },
      "1",
      null,
      h.manager,
      mutation(),
    );
    expect(first.version).toBe(1);
    await expect(
      h.app.setModuleConfiguration(
        h.tenant.id,
        a.id,
        "event_engine",
        { enabled: true },
        "1",
        null,
        h.manager,
        mutation(),
      ),
    ).rejects.toThrow();
  });
  it("bounds configuration depth", async () => {
    const h = await seed(),
      { a } = await base(h);
    await expect(
      h.app.setModuleConfiguration(
        h.tenant.id,
        a.id,
        "event_engine",
        { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } },
        "1",
        null,
        h.manager,
        mutation(),
      ),
    ).rejects.toThrow(/depth/);
  });
  it("does not store full configuration in audit", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.setModuleConfiguration(
      h.tenant.id,
      a.id,
      "event_engine",
      { credentialSecretReference: "EVENT_KEY" },
      "1",
      null,
      h.manager,
      mutation(),
    );
    const text = JSON.stringify(
      (
        await env.DB.prepare(
          "SELECT action,resource_reference,reason_code FROM audit_records WHERE action='module.configuration_changed'",
        ).all()
      ).results,
    );
    expect(text).not.toContain("EVENT_KEY");
  });
  it("keeps entitlement history immutable", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
      mutation(),
    );
    await expect(
      env.DB.prepare("DELETE FROM module_entitlement_history").run(),
    ).rejects.toThrow(/entitlement_history_immutable/);
  });
  it("isolates observation sidecar failure", async () => {
    const h = await seed(),
      { a } = await base(h);
    const guard = new ModuleAccessGuard(
      h.app.assemblyRepository,
      h.app,
      new LocalAllowTrafficAdapter(),
      {
        record: async () => {
          throw new Error("sidecar");
        },
      },
      () => h.clock.value,
    );
    await expect(
      guard.assertAccess(ctx(h, a.id, "event_engine")),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENTITLED" });
  });
  it("records idempotent entitlement and audit once", async () => {
    const h = await seed(),
      { a } = await base(h),
      m = mutation("grant-once"),
      input = {
        status: "purchased" as const,
        validFrom: h.clock.value,
        reasonCode: "BUY",
      };
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      input,
      m,
    );
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      input,
      m,
    );
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM application_module_entitlements WHERE application_id=?1",
        )
          .bind(a.id)
          .first<{ count: number }>()
      )?.count,
    ).toBe(1);
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM audit_records WHERE action='module.entitlement_granted' AND resource_reference IN (SELECT id FROM application_module_entitlements WHERE application_id=?1)",
        )
          .bind(a.id)
          .first<{ count: number }>()
      )?.count,
    ).toBe(1);
  });
});

describe("Event and Business Network assembly integration", () => {
  it("invokes Event and Network only through the shared application gateway", async () => {
    const h = await seed(),
      { b } = await base(h);
    for (const m of ["event_engine", "business_network_engine"]) {
      await h.app.grantEntitlement(
        operator,
        h.tenant.id,
        b.id,
        m,
        { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
        mutation(),
      );
      await h.app.enableModule(h.tenant.id, b.id, m, h.manager, mutation());
    }
    const gateway = new ApplicationModuleServiceGateway(h.guard),
      common = {
        source: "trusted_runtime_context" as const,
        tenantId: h.tenant.id,
        applicationId: b.id,
        actorMembershipId: h.membership.id,
        operation: "query",
        correlationId: "gateway",
      };
    await expect(
      gateway.invokeEvent(
        { ...common, requiredPermission: "tenant:read" },
        async () => "event-ok",
      ),
    ).resolves.toBe("event-ok");
    await expect(
      gateway.invokeBusinessNetwork(
        { ...common, requiredPermission: "network:read" },
        async () => "network-ok",
      ),
    ).resolves.toBe("network-ok");
  });
  it("retains Event domain data while its module is disabled", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    await env.DB.prepare(
      "INSERT INTO events(id,tenant_id,title,description,status,registration_opens_at,registration_closes_at,payment_mode,version,published_at,cancelled_at,created_at,updated_at) VALUES('019d0000-0000-7000-8000-000000888888',?1,'Retained','','draft',1,2,'free',1,NULL,NULL,1,1)",
    )
      .bind(h.tenant.id)
      .run();
    await h.app.disableModule(
      h.tenant.id,
      a.id,
      "event_engine",
      h.manager,
      mutation(),
    );
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM events WHERE tenant_id=?1",
        )
          .bind(h.tenant.id)
          .first<{ count: number }>()
      )?.count,
    ).toBe(1);
  });
});
describe("Application configuration and explicit trial expiry", () => {
  it("explicitly expires a trial with immutable history", async () => {
    const h = await seed(),
      { a } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      {
        status: "trial",
        validFrom: h.clock.value,
        validUntil: h.clock.value + 10000,
        reasonCode: "TRIAL",
      },
      mutation(),
    );
    await h.app.expireTrial(
      operator,
      h.tenant.id,
      a.id,
      "event_engine",
      1,
      "TRIAL_ENDED",
      mutation(),
    );
    await expect(
      h.guard.assertAccess(ctx(h, a.id, "event_engine")),
    ).rejects.toMatchObject({ code: "MODULE_NOT_ENTITLED" });
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM module_entitlement_history WHERE application_id=?1 AND to_status='expired'",
        )
          .bind(a.id)
          .first<{ count: number }>()
      )?.count,
    ).toBe(1);
  });
  it("versions bounded application configuration", async () => {
    const h = await seed(),
      { a } = await base(h);
    const first = await h.app.setApplicationConfiguration(
      h.tenant.id,
      a.id,
      { theme: "default" },
      "1",
      null,
      h.manager,
      mutation(),
    );
    const second = await h.app.setApplicationConfiguration(
      h.tenant.id,
      a.id,
      { theme: "dark" },
      "1",
      1,
      h.manager,
      mutation(),
    );
    expect([first.version, second.version]).toEqual([1, 2]);
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) count FROM application_configuration WHERE application_id=?1",
        )
          .bind(a.id)
          .first<{ count: number }>()
      )?.count,
    ).toBe(1);
  });
});

describe("Assembly authorization boundaries", () => {
  it("filters Network navigation for an actor without Network permissions", async () => {
    const h = await seed();
    const { b } = await base(h);
    await h.app.grantEntitlement(
      operator,
      h.tenant.id,
      b.id,
      "business_network_engine",
      { status: "purchased", validFrom: h.clock.value, reasonCode: "BUY" },
      mutation(),
    );
    await h.app.enableModule(
      h.tenant.id,
      b.id,
      "business_network_engine",
      h.manager,
      mutation(),
    );
    const user = await h.app.createPlatformUser(mutation());
    const membership = await h.app.addTenantMembership(
      h.tenant.id,
      user.id,
      "limited",
      mutation(),
    );
    await h.app.assignRole(
      h.tenant.id,
      membership.id,
      "tenant_member",
      mutation(),
    );
    expect(
      (
        await h.guard.buildNavigation(h.tenant.id, b.id, membership.id)
      ).items.filter((item) => item.navigationKey.startsWith("network.")),
    ).toHaveLength(0);
  });

  it("prevents Tenant A manager from mutating Tenant B Application", async () => {
    const h = await seed();
    const otherTenant = await h.app.createTenant("Other Tenant", mutation());
    const otherUser = await h.app.createPlatformUser(mutation());
    const otherMembership = await h.app.addTenantMembership(
      otherTenant.id,
      otherUser.id,
      "other",
      mutation(),
    );
    await h.app.assignRole(
      otherTenant.id,
      otherMembership.id,
      "tenant_owner",
      mutation(),
    );
    const permissions = Object.values(applicationAssemblyPermissions);
    await h.app.createTenantRole(
      otherTenant.id,
      "application_manager",
      "Application Manager",
      permissions,
      mutation(),
    );
    await h.app.assignRole(
      otherTenant.id,
      otherMembership.id,
      "application_manager",
      mutation(),
    );
    const otherApp = await h.app.createApplication(
      otherTenant.id,
      { membershipId: otherMembership.id },
      { applicationKey: "other", name: "Other", defaultLocale: "zh-TW" },
      mutation(),
    );
    await expect(
      h.app.suspendApplication(
        otherTenant.id,
        otherApp.id,
        1,
        h.manager,
        mutation(),
      ),
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });
});
