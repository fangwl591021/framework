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
import { createHealthHandler } from "./health";
import { createReadinessHandler, type ReadinessChecks } from "./readiness";
import { Router } from "./router";

export interface RuntimeComposition {
  readonly app: App;
  readonly modules: readonly ModuleBoundary[];
  readonly readiness: ReadinessChecks;
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
  }) satisfies ReadinessChecks;

  router.register({
    method: "GET",
    path: "/health",
    handler: createHealthHandler(clock),
  });
  router.register({
    method: "GET",
    path: "/ready",
    handler: createReadinessHandler(clock, readiness),
  });

  return Object.freeze({
    app: createApp({
      router,
      clock,
      uuidv7,
      logger: new NoopRuntimeLogger(),
    }),
    modules,
    readiness,
    ports: Object.freeze({
      audit: new DisabledAuditAdapter(),
      idempotency: new DisabledIdempotencyAdapter(),
    }),
  });
}
