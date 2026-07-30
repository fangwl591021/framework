export type ErrorCode =
  | "INVALID_REQUEST"
  | "ROUTE_NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR"
  | "SERVICE_NOT_READY";

const STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  INVALID_REQUEST: 400,
  ROUTE_NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_ERROR: 500,
  SERVICE_NOT_READY: 503,
};

const MESSAGE_BY_CODE: Readonly<Record<ErrorCode, string>> = {
  INVALID_REQUEST: "The request is invalid.",
  ROUTE_NOT_FOUND: "The requested route was not found.",
  METHOD_NOT_ALLOWED: "The request method is not allowed for this route.",
  INTERNAL_ERROR: "The service could not complete the request.",
  SERVICE_NOT_READY: "The service is not ready.",
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
