import type { Clock } from "./core/clock";
import { toFoundationError } from "./core/errors";
import type { RuntimeLogger } from "./core/logger";
import {
  createRequestContext,
  type RequestContextDependencies,
} from "./core/request-context";
import { errorResponse } from "./core/response-envelope";
import type { UuidV7 } from "./core/uuidv7";
import {
  runtimeFailureObservation,
  type RuntimeObservationPort,
} from "./platform-observability/runtime-observation";
import { runtimeSupportCode } from "./platform-observability/support-code";
import type { Router } from "./runtime/router";

export interface App {
  fetch(request: Request, executionContext?: ExecutionContext): Promise<Response>;
}

export interface AppDependencies {
  readonly router: Router;
  readonly clock: Clock;
  readonly uuidv7: UuidV7;
  readonly logger: RuntimeLogger;
  readonly observations?: RuntimeObservationPort;
}

export function createApp(dependencies: AppDependencies): App {
  const requestContextDependencies: RequestContextDependencies = {
    clock: dependencies.clock,
    uuidv7: dependencies.uuidv7,
  };

  return Object.freeze({
    async fetch(
      request: Request,
      executionContext?: ExecutionContext,
    ): Promise<Response> {
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
        const supportCode = runtimeSupportCode(context.correlationId);
        const observationTask = dependencies.observations?.recordFailure(
          runtimeFailureObservation(context, supportCode),
        ).catch(() => undefined);
        if (observationTask) {
          if (executionContext) executionContext.waitUntil(observationTask);
          else await observationTask;
        }
        return errorResponse(
          toFoundationError(error),
          context,
          dependencies.clock,
          {
            supportCode,
            retryable: true,
            actionRequired: false,
            statusCategory: "failed",
          },
        );
      }
    },
  });
}