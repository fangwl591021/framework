import {
  ApplicationAssemblyApplication,
  applicationAssemblyPermissions,
} from "../application-assembly";
import type { MutationContext } from "../application/core-services";
import { SystemClock } from "../core/clock";
import { UuidV7Generator } from "../core/uuidv7";
import {
  EventEngineApplication,
  HmacEventQrTokenService,
  eventPermissionPolicy,
} from "../modules/event-engine";
import {
  BusinessNetworkApplication,
  businessNetworkPermissions,
} from "../modules/business-network";
import {
  observabilityPermissions,
  PlatformObservabilityApplication,
} from "../platform-observability";
import { LocalIdentityKeys, LocalQrKeys } from "./keys";

export interface DemoFixtureState {
  tenantA: string;
  tenantB: string;
  appA: string;
  appB: string;
  tenantBApp: string;
  ownerMembership: string;
  tenantBOwnerMembership: string;
  memberMembership: string;
  operatorMembership: string;
  eventReference: string;
  supportCode: string;
}
const actor = `digest:${"a".repeat(64)}`;
const ctx = (key: string): MutationContext => ({
  idempotencyKey: `local-demo:${key}`,
  actorType: "platform_user",
  actorReference: actor,
  correlationId: `local-demo:${key}`,
});
const platformOperator = {
  authority: "platform_operator" as const,
  permissionKeys: [
    applicationAssemblyPermissions.catalogManage,
    applicationAssemblyPermissions.entitlementManage,
  ],
};

async function seedAiLabFixtures(
  db: D1Database,
  values: {
    tenantA: string;
    appA: string;
    appB: string;
    tenantB: string;
    tenantBApp: string;
  },
): Promise<void> {
  const budgetSql = `INSERT OR IGNORE INTO ai_budgets(
    id,scope_type,scope_key,tenant_id,application_id,window_key,
    window_started_at,window_ends_at,max_requests,max_input_units,max_output_units,
    max_cost_micros,max_concurrent,used_requests,used_input_units,used_output_units,
    used_cost_micros,concurrent_claims,status,version,created_at,updated_at
  ) VALUES(?1,?2,?3,?4,?5,'local-shadow-lab',0,4102444800000,
    1000,1000000,1000000,1000000,20,0,0,0,0,0,'active',1,1,1)`;
  const policySql = `INSERT OR IGNORE INTO ai_route_policies(
    id,scope_type,tenant_id,application_id,task_key,task_version,quality_tier,
    route_chain_json,max_cost_micros,max_latency_ms,cache_allowed,status,version,
    created_at,updated_at
  ) VALUES(?1,'application',?2,?3,'workbench.intent_resolution',1,'deterministic',
    '[{"providerKey":"deterministic_local_adapter","modelKey":"deterministic-fixture","modelVersion":"1"},{"providerKey":"disabled_generic_adapter","modelKey":"disabled","modelVersion":"1"}]',
    0,5000,1,'active',1,1,1)`;
  await db.batch([
    db.prepare(budgetSql).bind(
      "019f0000-0000-7000-8000-000000009101",
      "platform",
      "platform",
      null,
      null,
    ),
    db.prepare(budgetSql).bind(
      "019f0000-0000-7000-8000-000000009102",
      "tenant",
      `tenant:${values.tenantA}`,
      values.tenantA,
      null,
    ),
    db.prepare(budgetSql).bind(
      "019f0000-0000-7000-8000-000000009103",
      "application",
      `application:${values.tenantA}:${values.appA}`,
      values.tenantA,
      values.appA,
    ),
    db.prepare(budgetSql).bind(
      "019f0000-0000-7000-8000-000000009104",
      "application",
      `application:${values.tenantA}:${values.appB}`,
      values.tenantA,
      values.appB,
    ),
    db.prepare(budgetSql).bind(
      "019f0000-0000-7000-8000-000000009105",
      "tenant",
      `tenant:${values.tenantB}`,
      values.tenantB,
      null,
    ),
    db.prepare(budgetSql).bind(
      "019f0000-0000-7000-8000-000000009106",
      "application",
      `application:${values.tenantB}:${values.tenantBApp}`,
      values.tenantB,
      values.tenantBApp,
    ),
    db.prepare(policySql).bind(
      "019f0000-0000-7000-8000-000000009121",
      values.tenantA,
      values.appA,
    ),
    db.prepare(policySql).bind(
      "019f0000-0000-7000-8000-000000009122",
      values.tenantA,
      values.appB,
    ),
    db.prepare(policySql).bind(
      "019f0000-0000-7000-8000-000000009123",
      values.tenantB,
      values.tenantBApp,
    ),
  ]);
}

export async function readFixture(
  db: D1Database,
): Promise<DemoFixtureState | null> {
  const row = await db
    .prepare(
      "SELECT state_json FROM local_demo_state WHERE state_key='fixture_v2'",
    )
    .first<{ state_json: string }>();
  return row ? (JSON.parse(row.state_json) as DemoFixtureState) : null;
}
export async function seedFixture(db: D1Database): Promise<DemoFixtureState> {
  const prior = await readFixture(db);
  if (prior) return prior;
  const clock = new SystemClock(),
    uuid = new UuidV7Generator(),
    keys = new LocalIdentityKeys();
  const core = new ApplicationAssemblyApplication(db, clock, uuid, keys);
  const owner = await core.createPlatformUser(ctx("owner-user"));
  const member = await core.createPlatformUser(ctx("member-user"));
  const operator = await core.createPlatformUser(ctx("operator-user"));
  const tenant = await core.createTenant(
    "Local Demo Tenant A",
    ctx("tenant-a"),
  );
  const ownerMembership = await core.addTenantMembership(
    tenant.id,
    owner.id,
    "local-owner",
    ctx("owner-membership"),
  );
  const memberMembership = await core.addTenantMembership(
    tenant.id,
    member.id,
    "local-member",
    ctx("member-membership"),
  );
  const operatorMembership = await core.addTenantMembership(
    tenant.id,
    operator.id,
    "local-operator",
    ctx("operator-membership"),
  );
  await core.assignRole(
    tenant.id,
    ownerMembership.id,
    "tenant_owner",
    ctx("owner-core-role"),
  );
  const permissions = [
    ...new Set([
      "conversation:use",
      "tenant:read",
      "tenant:update",
      "membership:read",
      "membership:manage",
      "ai_gateway:invoke",
      "ai_task:read",
      "ai_provider:read",
      "ai_policy:read",
      "ai_budget:read",
      "ai_usage:read_tenant",
      ...Object.values(applicationAssemblyPermissions),
      ...Object.values(eventPermissionPolicy),
      ...Object.values(businessNetworkPermissions),
      ...Object.values(observabilityPermissions),
    ]),
  ];
  await core.createTenantRole(
    tenant.id,
    "local_demo_manager",
    "Local Demo Manager",
    permissions,
    ctx("manager-role"),
  );
  await core.assignRole(
    tenant.id,
    ownerMembership.id,
    "local_demo_manager",
    ctx("owner-manager"),
  );
  await core.assignRole(
    tenant.id,
    operatorMembership.id,
    "local_demo_manager",
    ctx("operator-manager"),
  );
  await core.createTenantRole(
    tenant.id,
    "local_demo_member",
    "Local Demo Member",
    [
      "conversation:use",
      "tenant:read",
      businessNetworkPermissions.networkRead,
      businessNetworkPermissions.referralRead,
      businessNetworkPermissions.salesRead,
      businessNetworkPermissions.commissionReadSelf,
    ],
    ctx("member-role"),
  );
  await core.assignRole(
    tenant.id,
    memberMembership.id,
    "local_demo_member",
    ctx("member-role-assignment"),
  );
  const appA = await core.createApplication(
    tenant.id,
    { membershipId: ownerMembership.id },
    {
      applicationKey: "local-a",
      name: "Local Application A",
      defaultLocale: "zh-TW",
    },
    ctx("app-a"),
  );
  const appB = await core.createApplication(
    tenant.id,
    { membershipId: ownerMembership.id },
    {
      applicationKey: "local-b",
      name: "Local Application B",
      defaultLocale: "zh-TW",
    },
    ctx("app-b"),
  );
  const tenantB = await core.createTenant(
    "Local Demo Tenant B",
    ctx("tenant-b"),
  );
  const tenantBOwnerMembership = await core.addTenantMembership(
    tenantB.id,
    owner.id,
    "local-owner-b",
    ctx("owner-membership-b"),
  );
  await core.assignRole(
    tenantB.id,
    tenantBOwnerMembership.id,
    "tenant_owner",
    ctx("owner-core-role-b"),
  );
  await core.createTenantRole(
    tenantB.id,
    "local_demo_manager",
    "Local Demo Manager",
    permissions,
    ctx("manager-role-b"),
  );
  await core.assignRole(
    tenantB.id,
    tenantBOwnerMembership.id,
    "local_demo_manager",
    ctx("owner-manager-b"),
  );
  const tenantBApp = await core.createApplication(
    tenantB.id,
    { membershipId: tenantBOwnerMembership.id },
    {
      applicationKey: "local-tenant-b",
      name: "Local Tenant B Application",
      defaultLocale: "zh-TW",
    },
    ctx("app-tenant-b"),
  );
  await seedAiLabFixtures(db, {
    tenantA: tenant.id,
    tenantB: tenantB.id,
    appA: appA.id,
    appB: appB.id,
    tenantBApp: tenantBApp.id,
  });
  for (const module of [
    { moduleKey: "event_engine", displayName: "Event Engine" },
    {
      moduleKey: "business_network_engine",
      displayName: "Business Network Engine",
    },
  ])
    await core.registerModule(
      platformOperator,
      {
        ...module,
        version: "1.0.0",
        category: "domain",
        lifecycleStatus: "candidate",
        contractVersion: "1",
        configurationSchemaVersion: "1",
        navigationManifestVersion: "1",
      },
      ctx(`catalog-${module.moduleKey}`),
    );
  for (const moduleKey of ["event_engine", "business_network_engine"]) {
    await core.grantEntitlement(
      platformOperator,
      tenant.id,
      appA.id,
      moduleKey,
      { status: "purchased", validFrom: 0, reasonCode: "LOCAL_DEMO" },
      ctx(`entitlement-${moduleKey}`),
    );
    await core.enableModule(
      tenant.id,
      appA.id,
      moduleKey,
      { membershipId: ownerMembership.id },
      ctx(`enable-${moduleKey}`),
    );
  }
  const eventApp = new EventEngineApplication(
    db,
    clock,
    uuid,
    keys,
    new HmacEventQrTokenService(new LocalQrKeys(), clock),
  );
  const seeded = await eventApp.createEventWithSession(
    tenant.id,
    ownerMembership.id,
    {
      title: "Platform Core Local Demo Day",
      description: "Local-only seeded event",
      registrationOpensAt: 1,
      registrationClosesAt: Date.now() + 86_400_000,
      paymentMode: "free",
    },
    {
      title: "Main Session",
      startsAt: Date.now() + 172_800_000,
      endsAt: Date.now() + 176_400_000,
      capacity: 30,
      waitlistCapacity: 10,
    },
    ctx("event"),
  );
  await eventApp.publishEvent(
    tenant.id,
    ownerMembership.id,
    seeded.event.id,
    ctx("event-publish"),
  );
  const network = new BusinessNetworkApplication(db, clock, uuid, keys, {
    assertEnabled: async () => {},
  });
  const partner = await network.createNetworkPartner(
    tenant.id,
    ownerMembership.id,
    {
      platformUserId: owner.id,
      partnerType: "affiliate",
      displayName: "Local Demo Owner",
    },
    ctx("partner"),
  );
  await network.createNetworkPartner(
    tenant.id,
    ownerMembership.id,
    {
      platformUserId: member.id,
      partnerType: "affiliate",
      displayName: "Local Demo Member",
    },
    ctx("member-partner"),
  );
  const referral = await network.createReferralLink(
    tenant.id,
    ownerMembership.id,
    partner.id,
    {
      referralCode: "LOCAL-DEMO",
      targetType: "demo",
      targetReference: "demo-sale",
    },
    ctx("referral-link"),
  );
  await network.recordReferralTouch(
    tenant.id,
    ownerMembership.id,
    {
      referralLinkId: referral.id,
      visitorReference: `user:${member.id}`,
      sourceChannel: "local-demo",
    },
    ctx("referral-touch"),
  );
  const sale = await network.recordSale(
    tenant.id,
    ownerMembership.id,
    {
      sellerPartnerId: partner.id,
      buyerReference: `user:${member.id}`,
      targetType: "demo",
      targetReference: "demo-sale",
      grossAmount: 120000,
      currency: "TWD",
    },
    ctx("sale"),
  );
  await network.attributeSale(
    tenant.id,
    ownerMembership.id,
    sale.id,
    ctx("sale-attribution"),
  );
  await network.createCommissionRule(
    tenant.id,
    ownerMembership.id,
    {
      ruleKey: "LOCAL_DEMO_10_PERCENT",
      name: "Local Demo 10%",
      calculationType: "percentage",
      rate: 1000,
      currency: "TWD",
      targetType: "demo",
      priority: 100,
      validFrom: 0,
    },
    ctx("commission-rule"),
  );
  const calculated = await network.calculateCommission(
    tenant.id,
    ownerMembership.id,
    sale.id,
    ctx("commission-calculate"),
  );
  const approved = await network.approveCommission(
    tenant.id,
    ownerMembership.id,
    calculated.id,
    ctx("commission-approve"),
  );
  await network.markCommissionPaid(
    tenant.id,
    ownerMembership.id,
    approved.id,
    ctx("commission-paid"),
  );
  const observability = new PlatformObservabilityApplication(
    db,
    clock,
    uuid,
    keys,
  );
  const diagnostic = await observability.observe(
    {
      correlationId: "local-demo-diagnostic",
      traceId: "local-demo-trace",
      environment: "development",
      releaseId: "local-demo",
      tenantId: tenant.id,
      applicationId: appA.id,
      moduleKey: "platform-core",
      operation: "local.demo",
      eventType: "request.failed",
      severity: "warning",
      status: "failed",
      errorCode: "LOCAL_DEMO_FAILURE",
      safeMessage: "Local demonstration diagnostic.",
      actorReferenceDigest: actor,
      metadata: { fixture: true },
    },
    ctx("diagnostic"),
  );
  if (!diagnostic.supportCode)
    throw new Error("Local diagnostic support code was not created");
  const state: DemoFixtureState = {
    tenantA: tenant.id,
    tenantB: tenantB.id,
    appA: appA.id,
    appB: appB.id,
    tenantBApp: tenantBApp.id,
    ownerMembership: ownerMembership.id,
    tenantBOwnerMembership: tenantBOwnerMembership.id,
    memberMembership: memberMembership.id,
    operatorMembership: operatorMembership.id,
    eventReference: seeded.event.id,
    supportCode: diagnostic.supportCode,
  };
  await db
    .prepare(
      "INSERT INTO local_demo_state(state_key,state_json,updated_at) VALUES('fixture_v2',?1,?2)",
    )
    .bind(JSON.stringify(state), Date.now())
    .run();
  return state;
}
