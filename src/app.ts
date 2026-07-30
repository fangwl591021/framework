import type { Clock } from "./core/clock";
import { toFoundationError } from "./core/errors";
import type { RuntimeLogger } from "./core/logger";
import {
  createRequestContext,
  type RequestContextDependencies,
} from "./core/request-context";
import { errorResponse } from "./core/response-envelope";
import type { UuidV7 } from "./core/uuidv7";
import type { Router } from "./runtime/router";

export interface App {
  fetch(request: Request): Promise<Response>;
}

export interface AppDependencies {
  readonly router: Router;
  readonly clock: Clock;
  readonly uuidv7: UuidV7;
  readonly logger: RuntimeLogger;
}

export function createApp(dependencies: AppDependencies): App {
  const requestContextDependencies: RequestContextDependencies = {
    clock: dependencies.clock,
    uuidv7: dependencies.uuidv7,
  };

  return Object.freeze({
    async fetch(request: Request): Promise<Response> {
      const context = createRequestContext(request, requestContextDependencies);
      try {
        return await dependencies.router.dispatch(request, context);
      } catch (error) {
        dependencies.logger.error(
          {
            code: "UNHANDLED_RUNTIME_ERROR",
            correlationId: context.correlationId,
            method: context.method,
            pathname: context.normalizedPathname,
          },
          error,
        );
        return errorResponse(
          toFoundationError(error),
          context,
          dependencies.clock,
        );
      }
    },
  });
}
