import type { Clock } from "../core/clock";
import type { RequestContext } from "../core/request-context";
import { successResponse } from "../core/response-envelope";
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
): RouteHandler {
  return (_request: Request, context: RequestContext) =>
    successResponse(
      {
        status: "ready",
        scope: "runtime-foundation-only",
        checks,
        excludedReadiness: ["D1", "provider", "production"],
        correlationId: context.correlationId,
      },
      context,
      clock,
    );
}
