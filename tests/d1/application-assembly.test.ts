import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ApplicationAssemblyApplication,
  ApplicationAssemblyError,
  EventEngineModuleGateway,
  eventEngineNavigationManifest,
} from "../../src/modules/application-assembly";
import {
  EventEngineApplication,
  HmacEventQrTokenService,
} from "../../src/modules/event-engine";
import {
  TestClock,
  TestIdentityKeys,
  TestQrKeys,
  TestUuidV7,
  context,
  resetEventDatabase,
  setupTenant,
} from "./event-engine-helpers";

function assemblyHarness() {
  const clock = new TestClock();
  const uuid = new TestUuidV7();
  const identityKeys = new TestIdentityKeys();
  const event = new EventEngineApplication(
    env.DB,
    clock,
    uuid,
    identityKeys,
    new HmacEventQrTokenService(new TestQrKeys(), clock),
  );
  const assembly = new ApplicationAssemblyApplication(
    env.DB,
    clock,
    uuid,
    identityKeys,
  );
  return {
    assembly,
    clock,
    event,
    gateway: new EventEngineModuleGateway(assembly, event),
  };
}

async function registerEventModule(
  assembly: ApplicationAssemblyApplication,
  tenantId: string,
  ownerMembershipId: string,
) {
  return assembly.registerModule(
    tenantId,
    ownerMembershipId,
    {
      moduleKey: "event-engine",
      displayName: "Event Engine",
      moduleVersion: "1.0.0",
      lifecycleStatus: "candidate",
      availabilityStatus: "available",
      accessPermissionKey: "tenant:read",
      navigationManifest: eventEngineNavigationManifest,
    },
    context(),
  );
}

beforeEach(resetEventDatabase);

describe("Application Assembly and Module Enablement", () => {
  it("uses bounded composite indexes for common application and module lookups", async () => {
    async function plan(sql: string): Promise<string> {
      const result = await env.DB.prepare(`EXPLAIN QUERY PLAN ${sql}`).all<{ detail: string }>();
      return result.results.map(({ detail }) => detail).join("\n");
    }

    expect(await plan("SELECT id FROM applications WHERE tenant_id = 't' AND status = 'active' ORDER BY updated_at DESC, id LIMIT 50")).toContain("idx_applications_tenant_status");
    expect(await plan("SELECT module_catalog_id FROM application_modules WHERE tenant_id = 't' AND application_id = 'a' AND enablement_status = 'enabled' AND entitlement_status IN ('included', 'purchased') LIMIT 100")).toContain("idx_application_modules_access");
    expect(await plan("SELECT id FROM module_entitlement_history WHERE tenant_id = 't' AND application_module_id = 'm' ORDER BY changed_at DESC, id DESC LIMIT 100")).toContain("idx_module_entitlement_history_time");
    expect(await plan("SELECT id FROM application_configuration WHERE tenant_id = 't' AND application_id = 'a' AND status = 'active' AND configuration_key = 'navigation.compact' LIMIT 1")).toContain("idx_application_configuration_lookup");
  });
  it("assembles two applications and gates navigation, dashboard, service, and data retention", async () => {
    const { assembly, clock, event: eventApp, gateway } = assemblyHarness();
    const setup = await setupTenant(eventApp, "Assembly Tenant");
    const applicationA = await assembly.createApplication(
      setup.tenant.id,
      setup.ownerMembership.id,
      "application-a",
      "Application A",
      context(),
    );
    const applicationB = await assembly.createApplication(
      setup.tenant.id,
      setup.ownerMembership.id,
      "application-b",
      "Application B",
      context(),
    );
    await registerEventModule(
      assembly,
      setup.tenant.id,
      setup.ownerMembership.id,
    );
    await assembly.grantModuleEntitlement(
      setup.tenant.id,
      setup.ownerMembership.id,
      applicationA.id,
      "event-engine",
      "purchased",
      null,
      context(),
    );
    await assembly.enableModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      applicationA.id,
      "event-engine",
      context(),
    );

    const contextA = await assembly.resolveTrustedApplicationContext(
      setup.tenant.id,
      applicationA.id,
      "server_route",
    );
    const contextB = await assembly.resolveTrustedApplicationContext(
      setup.tenant.id,
      applicationB.id,
      "server_route",
    );
    expect(await assembly.buildApplicationNavigation(
      contextA,
      setup.ownerMembership.id,
    )).toHaveLength(4);
    expect((await assembly.getApplicationDashboard(
      contextA,
      setup.ownerMembership.id,
    )).modules.map(({ moduleKey }) => moduleKey)).toEqual(["event-engine"]);
    expect(await assembly.buildApplicationNavigation(
      contextB,
      setup.ownerMembership.id,
    )).toEqual([]);
    await expect(gateway.execute(
      contextB,
      setup.ownerMembership.id,
      async () => "unreachable",
    )).rejects.toMatchObject({ code: "MODULE_NOT_ENTITLED" });

    const createdEvent = await gateway.execute(
      contextA,
      setup.ownerMembership.id,
      (service) => service.createEvent(
        setup.tenant.id,
        setup.ownerMembership.id,
        {
          title: "Assembled Event",
          description: "Module-gated Event Engine",
          registrationOpensAt: clock.current(),
          registrationClosesAt: clock.current() + 60_000,
          paymentMode: "free",
        },
        context(),
      ),
    );
    await assembly.disableModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      applicationA.id,
      "event-engine",
      context(),
    );
    expect(await assembly.buildApplicationNavigation(
      contextA,
      setup.ownerMembership.id,
    )).toEqual([]);
    expect(await assembly.canRunModuleBackgroundWork(
      setup.tenant.id,
      applicationA.id,
      "event-engine",
    )).toBe(false);
    await expect(gateway.execute(
      contextA,
      setup.ownerMembership.id,
      async () => "unreachable",
    )).rejects.toMatchObject({ code: "MODULE_NOT_ENABLED" });
    expect(await env.DB.prepare(
      "SELECT title FROM events WHERE tenant_id = ?1 AND id = ?2",
    ).bind(setup.tenant.id, createdEvent.id).first<{ title: string }>()).toEqual({
      title: "Assembled Event",
    });

    await assembly.enableModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      applicationA.id,
      "event-engine",
      context(),
    );
    expect(await gateway.execute(
      contextA,
      setup.ownerMembership.id,
      async () => "restored",
    )).toBe("restored");
  });

  it("rejects tenant crossing, client-selected context, unauthorized management, and expired trials", async () => {
    const { assembly, clock, event } = assemblyHarness();
    const tenantA = await setupTenant(event, "Tenant A");
    const tenantB = await setupTenant(event, "Tenant B");
    const application = await assembly.createApplication(
      tenantA.tenant.id,
      tenantA.ownerMembership.id,
      "secure-app",
      "Secure App",
      context(),
    );
    await registerEventModule(
      assembly,
      tenantA.tenant.id,
      tenantA.ownerMembership.id,
    );
    await expect(assembly.suspendApplication(
      tenantB.tenant.id,
      tenantB.ownerMembership.id,
      application.id,
      context(),
    )).rejects.toMatchObject({ code: "APPLICATION_SCOPE_DENIED" });
    await expect(assembly.resolveTrustedApplicationContext(
      tenantA.tenant.id,
      application.id,
      "client_header",
    )).rejects.toMatchObject({ code: "UNTRUSTED_APPLICATION_CONTEXT" });
    await expect(assembly.createApplication(
      tenantA.tenant.id,
      tenantA.memberMembership.id,
      "forbidden",
      "Forbidden",
      context(),
    )).rejects.toMatchObject({ code: "MODULE_PERMISSION_DENIED" });

    await assembly.grantModuleEntitlement(
      tenantA.tenant.id,
      tenantA.ownerMembership.id,
      application.id,
      "event-engine",
      "trial",
      clock.current() + 5_000,
      context(),
    );
    await assembly.enableModule(
      tenantA.tenant.id,
      tenantA.ownerMembership.id,
      application.id,
      "event-engine",
      context(),
    );
    clock.advance(10_000);
    const trusted = await assembly.resolveTrustedApplicationContext(
      tenantA.tenant.id,
      application.id,
      "server_route",
    );
    expect(await assembly.checkModuleAccess(
      trusted,
      tenantA.ownerMembership.id,
      "event-engine",
    )).toMatchObject({ allowed: false, reason: "MODULE_NOT_ENTITLED" });
    await assembly.revokeModuleEntitlement(
      tenantA.tenant.id,
      tenantA.ownerMembership.id,
      application.id,
      "event-engine",
      "revoked",
      context(),
    );
    expect(await assembly.checkModuleAccess(
      trusted,
      tenantA.ownerMembership.id,
      "event-engine",
    )).toMatchObject({ allowed: false, reason: "MODULE_NOT_ENTITLED" });
  });

  it("enforces dependencies and replays entitlement and enablement mutations exactly once", async () => {
    const { assembly, event } = assemblyHarness();
    const setup = await setupTenant(event, "Dependency Tenant");
    const application = await assembly.createApplication(
      setup.tenant.id,
      setup.ownerMembership.id,
      "dependency-app",
      "Dependency App",
      context(),
    );
    await assembly.registerModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      {
        moduleKey: "foundation-module",
        displayName: "Foundation",
        moduleVersion: "1.0.0",
        lifecycleStatus: "candidate",
        availabilityStatus: "available",
        accessPermissionKey: "tenant:read",
        navigationManifest: {
          items: [{ itemKey: "foundation", label: "Foundation", path: "/foundation" }],
        },
      },
      context(),
    );
    await assembly.registerModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      {
        moduleKey: "dependent-module",
        displayName: "Dependent",
        moduleVersion: "1.0.0",
        lifecycleStatus: "candidate",
        availabilityStatus: "available",
        accessPermissionKey: "tenant:read",
        navigationManifest: {
          items: [{ itemKey: "dependent", label: "Dependent", path: "/dependent" }],
        },
        dependencies: [{ moduleKey: "foundation-module" }],
      },
      context(),
    );
    await assembly.grantModuleEntitlement(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "dependent-module",
      "included",
      null,
      context(),
    );
    await expect(assembly.enableModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "dependent-module",
      context(),
    )).rejects.toMatchObject({ code: "MODULE_DEPENDENCY_UNSATISFIED" });

    const entitlementContext = context("entitlement-replay");
    const first = await assembly.grantModuleEntitlement(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "foundation-module",
      "included",
      null,
      entitlementContext,
    );
    expect(await assembly.grantModuleEntitlement(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "foundation-module",
      "included",
      null,
      entitlementContext,
    )).toEqual(first);
    const enableContext = context("enable-replay");
    await assembly.enableModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "foundation-module",
      enableContext,
    );
    await assembly.enableModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "foundation-module",
      enableContext,
    );
    await assembly.enableModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "dependent-module",
      context(),
    );
    const counts = await Promise.all([
      env.DB.prepare(
        "SELECT count(*) AS count FROM application_modules WHERE tenant_id = ?1",
      ).bind(setup.tenant.id).first<{ count: number }>(),
      env.DB.prepare(
        "SELECT count(*) AS count FROM module_entitlement_history WHERE tenant_id = ?1",
      ).bind(setup.tenant.id).first<{ count: number }>(),
    ]);
    expect(counts.map((row) => row?.count)).toEqual([2, 2]);
  });

  it("keeps configuration secrets out of storage and minimal audit payloads", async () => {
    const { assembly, event } = assemblyHarness();
    const setup = await setupTenant(event, "Configuration Tenant");
    const application = await assembly.createApplication(
      setup.tenant.id,
      setup.ownerMembership.id,
      "configuration-app",
      "Configuration App",
      context(),
    );
    await expect(assembly.setApplicationConfiguration(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "provider",
      { api_token: "must-not-be-stored" },
      context(),
    )).rejects.toBeInstanceOf(ApplicationAssemblyError);
    await assembly.setApplicationConfiguration(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "navigation.compact",
      true,
      context(),
    );
    const audit = await env.DB.prepare(
      `SELECT action, resource_reference
       FROM audit_records
       WHERE tenant_id = ?1 AND action = 'application.configuration.set'`,
    ).bind(setup.tenant.id).first<{
      action: string;
      resource_reference: string;
    }>();
    expect(audit).toEqual({
      action: "application.configuration.set",
      resource_reference: `${application.id}:navigation.compact`,
    });
    const stored = await env.DB.prepare(
      "SELECT value_json FROM application_configuration WHERE tenant_id = ?1",
    ).bind(setup.tenant.id).all<{ value_json: string }>();
    expect(JSON.stringify(stored.results)).not.toContain("must-not-be-stored");
  });
});
