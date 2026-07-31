import type { RequestContext } from "../core/request-context";

export interface RuntimeFailureObservation {
  readonly correlationId: string;
  readonly traceId: string;
  readonly operation: string;
  readonly eventType: "request.failed";
  readonly severity: "error";
  readonly status: "failed";
  readonly reasonCode: "UNHANDLED_RUNTIME_ERROR";
  readonly safeMessage: string;
  readonly supportCode: string;
}

export interface RuntimeObservationPort {
  recordFailure(observation: RuntimeFailureObservation): Promise<void>;
}

export class DisabledRuntimeObservationAdapter implements RuntimeObservationPort {
  async recordFailure(_observation: RuntimeFailureObservation): Promise<void> {
    return Promise.resolve();
  }
}

export function runtimeFailureObservation(
  context: RequestContext,
  supportCode: string,
): RuntimeFailureObservation {
  return Object.freeze({
    correlationId: context.correlationId,
    traceId: context.correlationId,
    operation: `${context.method} ${context.normalizedPathname}`,
    eventType: "request.failed",
    severity: "error",
    status: "failed",
    reasonCode: "UNHANDLED_RUNTIME_ERROR",
    safeMessage: "The service could not complete the request.",
    supportCode,
  });
}