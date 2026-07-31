import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ApplicationAssemblyApplication,
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

beforeEach(resetEventDatabase);

describe("Application Assembly atomicity assertions", () => {
  it("aborts stale enable and disable batches when their conditional update affects zero rows", async () => {
    const clock = new TestClock();
    const uuid = new TestUuidV7();
    const identity = new TestIdentityKeys();
    const event = new EventEngineApplication(
      env.DB,
      clock,
      uuid,
      identity,
      new HmacEventQrTokenService(new TestQrKeys(), clock),
    );
    const assembly = new ApplicationAssemblyApplication(
      env.DB,
      clock,
      uuid,
      identity,
    );
    const setup = await setupTenant(event, "Atomicity Tenant");
    const application = await assembly.createApplication(
      setup.tenant.id,
      setup.ownerMembership.id,
      "atomicity-app",
      "Atomicity App",
      context(),
    );
    await assembly.registerModule(
      setup.tenant.id,
      setup.ownerMembership.id,
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
    const entitlement = await assembly.grantModuleEntitlement(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "event-engine",
      "purchased",
      null,
      context(),
    );
    await assembly.enableModule(
      setup.tenant.id,
      setup.ownerMembership.id,
      application.id,
      "event-engine",
      context(),
    );

    const staleTimestamp = clock.current() + 10_000;
    const audit = (
      id: string,
      action:
        | "application.suspend"
        | "application.module.enable"
        | "application.module.disable",
      resourceReference = entitlement.id,
    ) => env.DB.prepare(
      `INSERT INTO audit_records (
        id, scope_type, tenant_id, actor_type, actor_reference, action,
        resource_type, resource_reference, decision, reason_code,
        correlation_reference, occurred_at, created_at
      ) VALUES (
        ?1, 'tenant', ?2, 'service', 'atomicity-test', ?3,
        'application_module', ?4, 'changed', 'TEST',
        'atomicity-test', ?5, ?5
      )`,
    ).bind(id, setup.tenant.id, action, resourceReference, staleTimestamp);

    await expect(env.DB.batch([
      env.DB.prepare(
        `UPDATE application_modules
         SET enablement_status = 'enabled', updated_at = ?1
         WHERE tenant_id = ?2 AND id = ?3
           AND enablement_status = 'disabled'`,
      ).bind(staleTimestamp, setup.tenant.id, entitlement.id),
      audit(
        "01990000-0000-7000-8000-000000099991",
        "application.module.enable",
      ),
    ])).rejects.toThrow(/application_module_enable_effect_missing/);

    await expect(env.DB.batch([
      env.DB.prepare(
        `UPDATE application_modules
         SET enablement_status = 'disabled', updated_at = ?1
         WHERE tenant_id = ?2 AND id = ?3
           AND enablement_status = 'disabled'`,
      ).bind(staleTimestamp, setup.tenant.id, entitlement.id),
      audit(
        "01990000-0000-7000-8000-000000099992",
        "application.module.disable",
      ),
    ])).rejects.toThrow(/application_module_disable_effect_missing/);

    await expect(env.DB.batch([
      env.DB.prepare(
        `UPDATE applications
         SET status = 'suspended', suspended_at = ?1, updated_at = ?1
         WHERE tenant_id = ?2 AND id = ?3 AND status = 'suspended'`,
      ).bind(staleTimestamp, setup.tenant.id, application.id),
      audit(
        "01990000-0000-7000-8000-000000099993",
        "application.suspend",
        application.id,
      ),
    ])).rejects.toThrow(/application_suspend_effect_missing/);

    expect(await env.DB.prepare(
      `SELECT enablement_status, updated_at
       FROM application_modules
       WHERE tenant_id = ?1 AND id = ?2`,
    ).bind(setup.tenant.id, entitlement.id).first()).toMatchObject({
      enablement_status: "enabled",
    });
  });
});
