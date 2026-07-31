import { DisabledAuditAdapter } from "../adapters/disabled-audit-adapter";
import { DisabledIdempotencyAdapter } from "../adapters/disabled-idempotency-adapter";
import { createApp, type App } from "../app";
import { SystemClock } from "../core/clock";
import { NoopRuntimeLogger } from "../core/logger";
import { UuidV7Generator } from "../core/uuidv7";
import { authorizationBoundary } from "../modules/authorization";
import { coreOperationsBoundary } from "../modules/core-operations";
import { identityCoreBoundary } from "../modules/identity-core";
import type { ModuleBoundary } from "../modules/module-boundary";
import { tenantAccessBoundary } from "../modules/tenant-access";
import type { AuditPort } from "../ports/audit-port";
import type { IdempotencyPort } from "../ports/idempotency-port";
import {
  DependencyRegistry,
  DependencyStatusAggregator,
  StaticDependencyProbe,
} from "../platform-observability/dependency-health";
import { DisabledRuntimeObservationAdapter } from "../platform-observability/runtime-observation";
import { ReleaseHealthEvaluator } from "../platform-reliability/release-health";
import { createHealthHandler } from "./health";
import { createReadinessHandler, type ReadinessChecks } from "./readiness";
import { Router } from "./router";

export interface RuntimeComposition {
  readonly app: App;
  readonly modules: readonly ModuleBoundary[];
  readonly readiness: ReadinessChecks;
  readonly dependencyHealth: DependencyStatusAggregator;
  readonly releaseHealth: ReleaseHealthEvaluator;
  readonly ports: {
    readonly audit: AuditPort;
    readonly idempotency: IdempotencyPort;
  };
}

export function createCompositionRoot(): RuntimeComposition {
  const clock = new SystemClock();
  const uuidv7 = new UuidV7Generator();
  const router = new Router();
  const modules = Object.freeze([
    identityCoreBoundary,
    tenantAccessBoundary,
    authorizationBoundary,
    coreOperationsBoundary,
  ]);
  if (modules.length !== 4) {
    throw new TypeError("Runtime composition requires four Module boundaries");
  }
  const readiness = Object.freeze({
    router: true,
    requestContext: true,
    uuidv7: true,
    moduleBoundaries: true,
    reliabilityFoundation: true,
  }) satisfies ReadinessChecks;
  const registry = new DependencyRegistry();
  registry.register({ dependencyKey: "runtime-core", required: true });
  registry.register({ dependencyKey: "release-health", required: true });
  registry.register({ dependencyKey: "d1-local-simulation", required: false });
  registry.register({ dependencyKey: "backup-provider", required: false });
  registry.register({ dependencyKey: "telegram", required: false });
  registry.register({ dependencyKey: "line", required: false });
  registry.register({ dependencyKey: "external-provider", required: false });
  const dependencyHealth = new DependencyStatusAggregator(clock, registry, [
    new StaticDependencyProbe("runtime-core", "healthy", "RUNTIME_HEALTHY"),
    new StaticDependencyProbe("release-health", "healthy", "RELEASE_HEALTHY"),
    new StaticDependencyProbe("d1-local-simulation", "unknown", "LOCAL_D1_NOT_BOUND"),
    new StaticDependencyProbe("backup-provider", "healthy", "LOCAL_ADAPTER_AVAILABLE"),
    new StaticDependencyProbe("telegram", "unavailable", "PROVIDER_DISABLED"),
    new StaticDependencyProbe("line", "unavailable", "PROVIDER_DISABLED"),
    new StaticDependencyProbe("external-provider", "unavailable", "PROVIDER_DISABLED"),
  ]);

  router.register({
    method: "GET",
    path: "/health",
    handler: createHealthHandler(clock),
  });
  router.register({
    method: "GET",
    path: "/ready",
    handler: createReadinessHandler(clock, readiness, dependencyHealth),
  });

  return Object.freeze({
    app: createApp({
      router,
      clock,
      uuidv7,
      logger: new NoopRuntimeLogger(),
      observations: new DisabledRuntimeObservationAdapter(),
    }),
    modules,
    readiness,
    dependencyHealth,
    releaseHealth: new ReleaseHealthEvaluator(),
    ports: Object.freeze({
      audit: new DisabledAuditAdapter(),
      idempotency: new DisabledIdempotencyAdapter(),
    }),
  });
}