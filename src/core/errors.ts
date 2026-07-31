export type ErrorCode =
  | "INVALID_REQUEST"
  | "ROUTE_NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR"
  | "SERVICE_NOT_READY"
  | "RATE_LIMITED"
  | "TENANT_RATE_LIMITED"
  | "PLATFORM_BUSY"
  | "DUPLICATE_EVENT"
  | "EVENT_FINGERPRINT_CONFLICT"
  | "CIRCUIT_OPEN"
  | "DEPENDENCY_UNAVAILABLE"
  | "REQUEST_DEFERRED"
  | "SERVICE_DEGRADED"
  | "MODULE_NOT_ENABLED"
  | "PERMISSION_DENIED";

const STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  INVALID_REQUEST: 400,
  ROUTE_NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_ERROR: 500,
  SERVICE_NOT_READY: 503,
  RATE_LIMITED: 429,
  TENANT_RATE_LIMITED: 429,
  PLATFORM_BUSY: 503,
  DUPLICATE_EVENT: 200,
  EVENT_FINGERPRINT_CONFLICT: 409,
  CIRCUIT_OPEN: 503,
  DEPENDENCY_UNAVAILABLE: 503,
  REQUEST_DEFERRED: 202,
  SERVICE_DEGRADED: 503,
  MODULE_NOT_ENABLED: 403,
  PERMISSION_DENIED: 403,
};

const MESSAGE_BY_CODE: Readonly<Record<ErrorCode, string>> = {
  INVALID_REQUEST: "The request is invalid.",
  ROUTE_NOT_FOUND: "The requested route was not found.",
  METHOD_NOT_ALLOWED: "The request method is not allowed for this route.",
  INTERNAL_ERROR: "The service could not complete the request.",
  SERVICE_NOT_READY: "The service is not ready.",
  RATE_LIMITED: "The request rate is temporarily limited.",
  TENANT_RATE_LIMITED: "The tenant request rate is temporarily limited.",
  PLATFORM_BUSY: "The platform is temporarily busy.",
  DUPLICATE_EVENT: "The event was already accepted.",
  EVENT_FINGERPRINT_CONFLICT: "The event identity conflicts with an earlier request.",
  CIRCUIT_OPEN: "The required dependency is temporarily unavailable.",
  DEPENDENCY_UNAVAILABLE: "A required dependency is unavailable.",
  REQUEST_DEFERRED: "The request was accepted for deferred processing.",
  SERVICE_DEGRADED: "The service is operating in a protected mode.",
  MODULE_NOT_ENABLED: "The requested module is not enabled.",
  PERMISSION_DENIED: "The requested operation is not permitted.",
};

export class FoundationError extends Error {
  readonly status: number;
  readonly safeMessage: string;

  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = "FoundationError";
    this.status = STATUS_BY_CODE[code];
    this.safeMessage = MESSAGE_BY_CODE[code];
  }
}

export class PersistenceUnavailableError extends Error {
  readonly code = "PERSISTENCE_NOT_IMPLEMENTED";

  constructor(capability: "audit" | "idempotency") {
    super(`${capability} persistence is not implemented`);
    this.name = "PersistenceUnavailableError";
  }
}

export function toFoundationError(error: unknown): FoundationError {
  return error instanceof FoundationError
    ? error
    : new FoundationError("INTERNAL_ERROR");
}
