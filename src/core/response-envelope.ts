import type { Clock } from "./clock";
import type { FoundationError } from "./errors";
import type { RequestContext } from "./request-context";

interface ResponseMeta {
  readonly correlationId: string;
  readonly timestamp: string;
}

interface SuccessEnvelope<T> {
  readonly ok: true;
  readonly data: T;
  readonly meta: ResponseMeta;
}

export interface ErrorDiagnosticFields {
  readonly supportCode: string | null;
  readonly retryable: boolean;
  readonly actionRequired: boolean;
  readonly statusCategory: "failed" | "action_required";
}

interface ErrorEnvelope {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly supportCode?: string | null;
    readonly retryable?: boolean;
    readonly actionRequired?: boolean;
    readonly statusCategory?: "failed" | "action_required";
  };
  readonly meta: ResponseMeta;
}

const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
});

function meta(context: RequestContext, clock: Clock): ResponseMeta {
  return {
    correlationId: context.correlationId,
    timestamp: clock.now().toISOString(),
  };
}

export function successResponse<T>(
  data: T,
  context: RequestContext,
  clock: Clock,
  status = 200,
): Response {
  const body: SuccessEnvelope<T> = {
    ok: true,
    data,
    meta: meta(context, clock),
  };
  return Response.json(body, { status, headers: JSON_HEADERS });
}

export function errorResponse(
  error: FoundationError,
  context: RequestContext,
  clock: Clock,
  diagnostics?: ErrorDiagnosticFields,
): Response {
  const body: ErrorEnvelope = {
    ok: false,
    error: {
      code: error.code,
      message: error.safeMessage,
      ...(diagnostics ?? {}),
    },
    meta: meta(context, clock),
  };
  return Response.json(body, { status: error.status, headers: JSON_HEADERS });
}