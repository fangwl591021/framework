import type { Clock } from "../core/clock";
import { FoundationError } from "../core/errors";
import type { RequestContext } from "../core/request-context";
import { errorResponse, successResponse } from "../core/response-envelope";
import { runtimeSupportCode } from "../platform-observability/support-code";
import type { DependencyStatusAggregator } from "../platform-observability/dependency-health";
import type { TrafficReadinessPort } from "../platform-traffic/ports";
import type { RouteHandler } from "./router";

export interface ReadinessChecks {
  readonly router: true;
  readonly requestContext: true;
  readonly uuidv7: true;
  readonly moduleBoundaries: true;
  readonly reliabilityFoundation: true;
}

export function createReadinessHandler(
  clock: Clock,
  checks: ReadinessChecks,
  dependencies?: DependencyStatusAggregator,
  traffic?: TrafficReadinessPort,
): RouteHandler {
  return async (_request: Request, context: RequestContext) => {
    const snapshot = dependencies ? await dependencies.snapshot() : null;
    const trafficSnapshot = traffic ? await traffic.snapshot() : null;
    if ((snapshot && !snapshot.ready) || trafficSnapshot?.emergency) {
      return errorResponse(
        new FoundationError("SERVICE_NOT_READY"),
        context,
        clock,
        {
          supportCode: runtimeSupportCode(context.correlationId),
          retryable: true,
          actionRequired: false,
          statusCategory: "failed",
        },
      );
    }
    return successResponse(
      {
        status: "ready",
        scope: "runtime-foundation-only",
        checks,
        dependencyHealth: snapshot,
        trafficProtection: trafficSnapshot,
        excludedReadiness: ["D1", "provider", "production"],
        correlationId: context.correlationId,
      },
      context,
      clock,
    );
  };
}