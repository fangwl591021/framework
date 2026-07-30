import type { Clock } from "../core/clock";
import type { RequestContext } from "../core/request-context";
import { successResponse } from "../core/response-envelope";
import type { RouteHandler } from "./router";

export const RUNTIME_SERVICE = "platform-core-framework";
export const RUNTIME_VERSION = "0.1.0-foundation";

export function createHealthHandler(clock: Clock): RouteHandler {
  return (_request: Request, context: RequestContext) =>
    successResponse(
      {
        status: "healthy",
        service: RUNTIME_SERVICE,
        runtimeVersion: RUNTIME_VERSION,
        correlationId: context.correlationId,
      },
      context,
      clock,
    );
}
