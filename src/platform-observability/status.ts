import type {
  FailureClassification,
  ObservationEvent,
  OperationStatus,
  PlatformDiagnosticStatus,
  TenantDiagnosticStatus,
  UserSafeStatus,
} from "./models";

const DEFAULT_MESSAGE: Readonly<Record<OperationStatus, string>> = Object.freeze({
  accepted: "Your request was received.",
  processing: "Your request is being processed. Do not submit it again.",
  succeeded: "Your request was completed.",
  failed: "The service could not complete your request.",
  action_required: "More information or access is required before continuing.",
});

export class OperationStatusBuilder {
  user(
    status: OperationStatus,
    options: Readonly<{
      message?: string;
      retryable?: boolean;
      actionRequired?: boolean;
      supportCode?: string | null;
    }> = {},
  ): UserSafeStatus {
    return Object.freeze({
      status,
      message: boundedMessage(options.message ?? DEFAULT_MESSAGE[status]),
      retryable: options.retryable ?? false,
      actionRequired: options.actionRequired ?? status === "action_required",
      supportCode: options.supportCode ?? null,
    });
  }

  tenant(
    event: ObservationEvent,
    classification: FailureClassification,
    supportCode: string | null,
  ): TenantDiagnosticStatus {
    if (!event.tenantId) throw new TypeError("Tenant diagnostic requires tenantId");
    return Object.freeze({
      ...this.user(event.status, {
        message: event.safeMessage,
        retryable: classification.retryable,
        actionRequired: classification.actionRequired,
        supportCode,
      }),
      tenantId: event.tenantId,
      applicationId: event.applicationId,
      moduleKey: event.moduleKey,
      eventTime: event.timestamp,
      severity: event.severity,
      reasonCategory: classification.category,
      actorReferenceDigest: event.actorReferenceDigest,
      suggestedAction: classification.suggestedAction,
    });
  }

  platform(
    tenantStatus: TenantDiagnosticStatus,
    event: ObservationEvent,
    classification: FailureClassification,
    options: Readonly<{
      dependencyHealth?: PlatformDiagnosticStatus["dependencyHealth"];
      retryCount?: number;
      alertDeliveryState?: PlatformDiagnosticStatus["alertDeliveryState"];
      safeTechnicalEvidence?: PlatformDiagnosticStatus["safeTechnicalEvidence"];
    }> = {},
  ): PlatformDiagnosticStatus {
    return Object.freeze({
      ...tenantStatus,
      correlationId: event.correlationId,
      traceId: event.traceId,
      environment: event.environment,
      releaseId: event.releaseId,
      operation: event.operation,
      dependencyHealth: Object.freeze([...(options.dependencyHealth ?? [])]),
      retryCount: options.retryCount ?? 0,
      firstSeenAt: event.firstSeenAt,
      lastSeenAt: event.lastSeenAt,
      occurrenceCount: event.occurrenceCount,
      alertDeliveryState: options.alertDeliveryState ?? null,
      safeTechnicalEvidence: Object.freeze({
        failureCategory: classification.category,
        ...(options.safeTechnicalEvidence ?? {}),
      }),
    });
  }
}

function boundedMessage(message: string): string {
  const normalized = message.trim();
  if (!normalized || normalized.length > 500) {
    throw new TypeError("Diagnostic message must be between 1 and 500 characters");
  }
  if (/(authorization|cookie|secret|token|stack|select\s|insert\s|update\s|delete\s|[a-z]:\\)/i.test(normalized)) {
    throw new TypeError("Diagnostic message contains forbidden technical detail");
  }
  return normalized;
}
