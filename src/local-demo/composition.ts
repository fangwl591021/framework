import {
  ApplicationAssemblyApplication,
  ApplicationAssemblyRepository,
  ApplicationModuleServiceGateway,
  DisabledAssemblyObservationAdapter,
  LocalAllowTrafficAdapter,
  ModuleEligibilityEvaluator,
  ModuleInvocationGuard,
} from "../application-assembly";
import { SystemClock } from "../core/clock";
import { UuidV7Generator } from "../core/uuidv7";
import {
  EventEngineApplication,
  HmacEventQrTokenService,
} from "../modules/event-engine";
import { BusinessNetworkApplication } from "../modules/business-network";
import { PlatformObservabilityApplication } from "../platform-observability";
import {
  AllowlistedOperationRouter,
  ApplicationAssemblyWorkbenchAdapter,
  BusinessNetworkWorkbenchAdapter,
  ConversationalWorkbenchApplication,
  D1WorkbenchRepository,
  DeterministicIntentResolver,
  DiagnosticsWorkbenchAdapter,
  DisabledWorkbenchObservationAdapter,
  EventWorkbenchAdapter,
  TrafficAuthorizedPlatformInvocation,
} from "../conversational-workbench";
import { LocalIdentityKeys, LocalQrKeys } from "./keys";
import type { DemoFixtureState } from "./seed";

export function createLocalWorkbench(
  db: D1Database,
  fixture: DemoFixtureState,
) {
  const clock = new SystemClock(),
    uuid = new UuidV7Generator(),
    keys = new LocalIdentityKeys();
  const assembly = new ApplicationAssemblyApplication(db, clock, uuid, keys);
  const repository = new ApplicationAssemblyRepository(db);
  const traffic = new LocalAllowTrafficAdapter();
  const eligibility = new ModuleEligibilityEvaluator(
    repository,
    assembly,
    new DisabledAssemblyObservationAdapter(),
    () => clock.now().getTime(),
  );
  const gateway = new ApplicationModuleServiceGateway(
    new ModuleInvocationGuard(traffic, eligibility),
  );
  const event = new EventEngineApplication(
    db,
    clock,
    uuid,
    keys,
    new HmacEventQrTokenService(new LocalQrKeys(), clock),
  );
  const network = new BusinessNetworkApplication(db, clock, uuid, keys, {
    assertEnabled: async (tenantId, membershipId) =>
      eligibility.assertAccess({
        source: "trusted_runtime_context",
        tenantId,
        applicationId: fixture.appA,
        moduleKey: "business_network_engine",
        actorMembershipId: membershipId,
        requiredPermission: "tenant:read",
        operation: "network.inner_gate",
        correlationId: "local-demo",
      }),
  });
  const diagnostics = new PlatformObservabilityApplication(
    db,
    clock,
    uuid,
    keys,
  );
  const authorization = {
    hasPermission: (
      tenantId: string,
      membershipId: string,
      permission: string,
    ) => assembly.checkPermission(tenantId, membershipId, permission),
  };
  const platformBoundary = new TrafficAuthorizedPlatformInvocation(
    traffic,
    {
      isActive: async (tenantId, applicationId) =>
        (await repository.getApplication(tenantId, applicationId))?.status ===
        "active",
    },
    authorization,
  );
  const router = new AllowlistedOperationRouter([
    new EventWorkbenchAdapter(gateway, event),
    new BusinessNetworkWorkbenchAdapter(gateway, network),
    new ApplicationAssemblyWorkbenchAdapter(platformBoundary, assembly),
    new DiagnosticsWorkbenchAdapter(platformBoundary, diagnostics),
  ]);
  return new ConversationalWorkbenchApplication(
    new D1WorkbenchRepository(db),
    new DeterministicIntentResolver(),
    router,
    authorization,
    new DisabledWorkbenchObservationAdapter(),
    clock,
    uuid,
  );
}
