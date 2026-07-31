import type { EnvironmentName } from "../platform-reliability/models";

export type ObservationEventType =
  | "request.received"
  | "request.completed"
  | "request.failed"
  | "dependency.degraded"
  | "dependency.unavailable"
  | "backup.failed"
  | "restore.failed"
  | "release.unhealthy"
  | "webhook.failed"
  | "background_job.failed"
  | "data_validation.failed"
  | "permission.denied"
  | "configuration.invalid";

export type ObservationSeverity = "info" | "warning" | "error" | "critical";
export type OperationStatus =
  | "accepted"
  | "processing"
  | "succeeded"
  | "failed"
  | "action_required";

export type FailureCategory =
  | "USER_INPUT_INCOMPLETE"
  | "USER_INPUT_INVALID"
  | "PERMISSION_DENIED"
  | "MODULE_NOT_ENABLED"
  | "TENANT_CONFIGURATION_ERROR"
  | "APPLICATION_CONFIGURATION_ERROR"
  | "EXTERNAL_PROVIDER_DEGRADED"
  | "EXTERNAL_PROVIDER_UNAVAILABLE"
  | "DATABASE_OPERATION_FAILED"
  | "PLATFORM_INTERNAL_ERROR"
  | "RELEASE_HEALTH_FAILED"
  | "BACKUP_OR_RESTORE_FAILED"
  | "UNKNOWN_FAILURE";

export interface ObservationEvent {
  readonly eventId: string;
  readonly correlationId: string;
  readonly traceId: string;
  readonly timestamp: number;
  readonly environment: EnvironmentName;
  readonly releaseId: string;
  readonly tenantId: string | null;
  readonly applicationId: string | null;
  readonly moduleKey: string;
  readonly operation: string;
  readonly eventType: ObservationEventType;
  readonly severity: ObservationSeverity;
  readonly status: OperationStatus;
  readonly reasonCode: string;
  readonly safeMessage: string;
  readonly dependencyKey: string | null;
  readonly actorReferenceDigest: string | null;
  readonly occurrenceCount: number;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly metadataSafeJson: string;
  readonly retentionUntil: number;
}

export type IncidentStatus =
  | "open"
  | "acknowledged"
  | "investigating"
  | "mitigated"
  | "resolved";

export interface Incident {
  readonly incidentId: string;
  readonly scopeType: "platform" | "tenant" | "provider";
  readonly tenantId: string | null;
  readonly aggregationScopeKey: string;
  readonly fingerprint: string;
  readonly title: string;
  readonly severity: Exclude<ObservationSeverity, "info">;
  readonly status: IncidentStatus;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly occurrenceCount: number;
  readonly affectedTenantCount: number;
  readonly affectedApplicationCount: number;
  readonly dependencyKey: string | null;
  readonly releaseId: string;
  readonly ownerReference: string | null;
  readonly resolutionCode: string | null;
  readonly resolvedAt: number | null;
  readonly reopenCount: number;
}

export interface ObservationInput {
  readonly correlationId: string;
  readonly traceId: string;
  readonly environment: EnvironmentName;
  readonly releaseId: string;
  readonly tenantId?: string | null;
  readonly applicationId?: string | null;
  readonly moduleKey: string;
  readonly operation: string;
  readonly eventType: ObservationEventType;
  readonly severity: ObservationSeverity;
  readonly status: OperationStatus;
  readonly errorCode: string;
  readonly safeMessage: string;
  readonly dependencyKey?: string | null;
  readonly actorReferenceDigest?: string | null;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
  readonly retentionMs?: number;
}

export interface ObservationResult {
  readonly observation: ObservationEvent;
  readonly incident: Incident | null;
  readonly supportCode: string | null;
}

export interface FailureClassificationInput {
  readonly errorCode: string;
  readonly operation: string;
  readonly dependencyStatus?: DependencyStatus;
  readonly environment: EnvironmentName;
  readonly releaseHealthy?: boolean;
  readonly validationState?: "complete" | "incomplete" | "invalid";
}

export interface FailureClassification {
  readonly category: FailureCategory;
  readonly retryable: boolean;
  readonly actionRequired: boolean;
  readonly suggestedAction: string;
}

export type DependencyStatus =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "unknown";

export interface DependencyDefinition {
  readonly dependencyKey: string;
  readonly required: boolean;
}

export interface DependencyHealthResult {
  readonly dependencyKey: string;
  readonly status: DependencyStatus;
  readonly reasonCode: string;
  readonly checkedAt: number;
}

export interface DependencyHealthSnapshot {
  readonly ready: boolean;
  readonly checkedAt: number;
  readonly requiredUnavailableCount: number;
  readonly optionalDegradedCount: number;
  readonly results: readonly DependencyHealthResult[];
}

export interface UserSafeStatus {
  readonly status: OperationStatus;
  readonly message: string;
  readonly retryable: boolean;
  readonly actionRequired: boolean;
  readonly supportCode: string | null;
}

export interface TenantDiagnosticStatus extends UserSafeStatus {
  readonly tenantId: string;
  readonly applicationId: string | null;
  readonly moduleKey: string;
  readonly eventTime: number;
  readonly severity: ObservationSeverity;
  readonly reasonCategory: FailureCategory;
  readonly actorReferenceDigest: string | null;
  readonly suggestedAction: string;
}

export interface PlatformDiagnosticStatus extends TenantDiagnosticStatus {
  readonly correlationId: string;
  readonly traceId: string;
  readonly environment: EnvironmentName;
  readonly releaseId: string;
  readonly operation: string;
  readonly dependencyHealth: readonly DependencyHealthResult[];
  readonly retryCount: number;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly occurrenceCount: number;
  readonly alertDeliveryState: AlertDeliveryStatus | null;
  readonly safeTechnicalEvidence: Readonly<Record<string, string | number | boolean | null>>;
}

export type AlertDeliveryStatus =
  | "pending"
  | "delivered"
  | "failed"
  | "retry_scheduled"
  | "suppressed";

export interface AlertPolicy {
  readonly policyId: string | null;
  readonly minimumSeverity: Exclude<ObservationSeverity, "info">;
  readonly eventCategory: string | null;
  readonly environment: EnvironmentName | null;
  readonly moduleKey: string | null;
  readonly tenantId: string | null;
  readonly dependencyKey: string | null;
  readonly aggregationWindowMs: number;
  readonly occurrenceThreshold: number;
  readonly cooldownMs: number;
  readonly escalationDelayMs: number;
  readonly enabled: boolean;
}

export interface AlertPayload {
  readonly severity: Exclude<ObservationSeverity, "info">;
  readonly environment: EnvironmentName;
  readonly incidentId: string;
  readonly safeTitle: string;
  readonly affectedTenantCount: number;
  readonly occurrenceCount: number;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly releaseId: string;
  readonly dependencyKey: string | null;
  readonly suggestedOperatorAction: string;
  readonly supportCode: string;
}

export interface AlertDeliveryRecord {
  readonly deliveryId: string;
  readonly incidentId: string;
  readonly deliveryKey: string;
  readonly providerKey: "local_capture" | "telegram";
  readonly severity: Exclude<ObservationSeverity, "info">;
  readonly status: AlertDeliveryStatus;
  readonly attemptCount: number;
  readonly nextRetryAt: number | null;
  readonly failureReasonCode: string | null;
  readonly createdAt: number;
  readonly deliveredAt: number | null;
}

export interface DiagnosticAccessContext {
  readonly tenantId: string | null;
  readonly membershipId: string | null;
  readonly permissionKeys: readonly string[];
}

export interface PageRequest {
  readonly limit?: number;
  readonly cursor?: string | null;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}
