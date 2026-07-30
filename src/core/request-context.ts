import type { Clock } from "./clock";
import { resolveCorrelationId } from "./correlation-id";
import type { UuidV7 } from "./uuidv7";

export interface RequestContext {
  readonly correlationId: string;
  readonly requestStartedAt: string;
  readonly method: string;
  readonly normalizedPathname: string;
  readonly trustedTenantContext: null;
  readonly authenticatedActor: null;
}

export interface RequestContextDependencies {
  readonly clock: Clock;
  readonly uuidv7: UuidV7;
}

export function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed.length > 1 && collapsed.endsWith("/")) {
    return collapsed.slice(0, -1);
  }
  return collapsed || "/";
}

export function createRequestContext(
  request: Request,
  dependencies: RequestContextDependencies,
): RequestContext {
  const url = new URL(request.url);
  return Object.freeze({
    correlationId: resolveCorrelationId(request.headers, dependencies.uuidv7),
    requestStartedAt: dependencies.clock.now().toISOString(),
    method: request.method.toUpperCase(),
    normalizedPathname: normalizePathname(url.pathname),
    trustedTenantContext: null,
    authenticatedActor: null,
  });
}
