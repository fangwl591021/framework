import {
  CoreApplicationBase,
  type MutationContext,
} from "../application/core-application-base";
import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import type { IdentityDigestKeyProvider } from "../persistence/crypto";
import { sha256Hex } from "../persistence/crypto";
import {
  DomainConflictError,
  DomainNotFoundError,
  TenantBoundaryError,
} from "../persistence/models";
import type { AlertCoordinator } from "./alerting";
import {
  buildIncident,
  buildObservation,
  buildObservationStatements,
  incidentScopeFor,
  normalizeObservation,
} from "./application-builders";
import { FailureClassifier } from "./classifier";
import type { DependencyStatusAggregator } from "./dependency-health";
import type {
  IncidentAggregationGuardPort,
  ObservabilityFailureEvidencePort,
} from "./failure-isolation";
import type {
  DiagnosticAccessContext,
  Incident,
  IncidentStatus,
  ObservationEvent,
  ObservationInput,
  ObservationResult,
  Page,
  PageRequest,
} from "./models";
import {
  D1ObservabilityRepository,
  type SupportCodeDiagnostic,
} from "./repository";
import {
  ObservationRetentionEligibility,
  type RetentionCleanupResult,
  type RetentionExecutionScope,
} from "./retention";
import { OperationStatusBuilder } from "./status";
import { SupportCodeCodec } from "./support-code";

const OBSERVATION_AGGREGATION_WINDOW_MS = 60_000;
export const observabilityPermissions = Object.freeze({
  diagnosticsReadTenant: "diagnostics:read_tenant",
  diagnosticsReadPlatform: "diagnostics:read_platform",
  incidentRead: "incident:read",
  incidentManage: "incident:manage",
  alertRead: "alert:read",
  alertManage: "alert:manage",
});

export class PlatformObservabilityApplication extends CoreApplicationBase {
  readonly observability: D1ObservabilityRepository;
  private readonly classifier = new FailureClassifier();
  private readonly statusBuilder = new OperationStatusBuilder();
  private readonly supportCodes = new SupportCodeCodec();
  private readonly retention = new ObservationRetentionEligibility();

  constructor(
    db: D1Database,
    clock: Clock,
    uuidv7: UuidV7,
    identityKeys: IdentityDigestKeyProvider,
    private readonly alerts: AlertCoordinator | null = null,
    private readonly dependencies: DependencyStatusAggregator | null = null,
    private readonly incidentAggregationGuard: IncidentAggregationGuardPort | null = null,
    private readonly failureEvidence: ObservabilityFailureEvidencePort | null = null,
  ) {
    super(db, clock, uuidv7, identityKeys);
    this.observability = new D1ObservabilityRepository(db);
  }

  async observe(
    input: ObservationInput,
    context: MutationContext,
  ): Promise<ObservationResult> {
    const now = this.clock.now().getTime();
    const normalized = normalizeObservation(input, now);
    assertSafeActor(context);
    this.statusBuilder.user(normalized.status, {
      message: normalized.safeMessage,
    });

    const classificationInput = {
      errorCode: normalized.errorCode,
      operation: normalized.operation,
      environment: normalized.environment,
    };
    const dependencyStatus = dependencyStatusFromEvent(normalized.eventType);
    const currentValidationState = validationState(normalized.errorCode);
    const classification = this.classifier.classify({
      ...classificationInput,
      ...(dependencyStatus ? { dependencyStatus } : {}),
      ...(normalized.eventType === "release.unhealthy"
        ? { releaseHealthy: false as const }
        : {}),
      ...(currentValidationState
        ? { validationState: currentValidationState }
        : {}),
    });
    const incidentScope = incidentScopeFor(
      classification.category,
      normalized.tenantId,
      normalized.dependencyKey,
    );
    const fingerprint = await sha256Hex(JSON.stringify({
      scope: incidentScope.aggregationScopeKey,
      category: classification.category,
      moduleKey: normalized.moduleKey,
      operation: normalized.operation,
      dependencyKey: normalized.dependencyKey,
      reasonCode: normalized.errorCode,
    }));
    const foundEvent = await this.observability.findAggregatedObservation(
      normalized.tenantId,
      {
        moduleKey: normalized.moduleKey,
        operation: normalized.operation,
        eventType: normalized.eventType,
        reasonCode: classification.category,
        dependencyKey: normalized.dependencyKey,
      },
      now - OBSERVATION_AGGREGATION_WINDOW_MS,
    );
    const existingIncident = normalized.severity === "info"
      ? null
      : await this.observability.findIncident(
        incidentScope.aggregationScopeKey,
        fingerprint,
      );
    const existingEvent = existingIncident?.status === "resolved"
      ? null
      : foundEvent;
    const tenantAlreadyAffected = existingIncident && normalized.tenantId
      ? await this.observability.incidentHasTenant(
        existingIncident.incidentId,
        normalized.tenantId,
      )
      : false;
    const applicationAlreadyAffected =
      existingIncident && normalized.applicationId
        ? await this.observability.incidentHasApplication(
          existingIncident.incidentId,
          normalized.applicationId,
        )
        : false;

    const eventId = existingEvent?.eventId ?? this.uuidv7.generate();
    const incidentId = existingIncident?.incidentId
      ?? (normalized.severity === "info" ? null : this.uuidv7.generate());
    const supportCode = normalized.status === "failed"
        || normalized.status === "action_required"
      ? (
        existingEvent
          ? await this.observability.findSupportCodeForObservation(eventId)
          : await this.supportCodes.generate(normalized.correlationId, eventId)
      )
      : null;
    const observation = buildObservation(
      normalized,
      classification.category,
      eventId,
      existingEvent,
      now,
    );
    const incident = incidentId
      ? buildIncident(
        normalized,
        classification.category,
        incidentScope,
        fingerprint,
        incidentId,
        existingIncident,
        tenantAlreadyAffected,
        applicationAlreadyAffected,
        now,
      )
      : null;

    const scope = normalized.tenantId
      ? { scopeType: "tenant" as const, tenantId: normalized.tenantId }
      : { scopeType: "platform" as const, tenantId: null };
    const fingerprintInput = {
      ...normalized,
      metadata: observation.metadataSafeJson,
      category: classification.category,
    };
    let result: ObservationResult;
    try {
      await this.incidentAggregationGuard?.assertAvailable(eventId);
      result = await this.executeIdempotent(
        scope,
        "observability.observe",
        fingerprintInput,
        context,
        (timestamp) => ({
          result: Object.freeze({ observation, incident, supportCode }),
          statements: buildObservationStatements(
            this.db,
            observation,
            existingEvent,
            incident,
            existingIncident,
            supportCode,
            this.uuidv7,
            this.supportCodes,
            context,
            timestamp,
          ),
          audit: {
            action: "diagnostic.observation.record",
            resourceType: "observation_event",
            resourceReference: eventId,
            reasonCode: classification.category,
          },
        }),
      );
    } catch (aggregationError) {
      if (aggregationError instanceof DomainConflictError) throw aggregationError;
      await this.recordFailureEvidence(
        normalized.correlationId,
        normalized.operation,
        existingEvent
          ? "INCIDENT_AGGREGATION_DEFERRED"
          : "OBSERVATION_WRITE_FAILED",
      );
      if (existingEvent) {
        return Object.freeze({
          observation: existingEvent,
          incident: existingIncident,
          supportCode,
        });
      }
      try {
        result = await this.executeIdempotent(
          scope,
          "observability.observe.unaggregated",
          fingerprintInput,
          context,
          (timestamp) => ({
            result: Object.freeze({ observation, incident: null, supportCode }),
            statements: buildObservationStatements(
              this.db,
              observation,
              null,
              null,
              null,
              supportCode,
              this.uuidv7,
              this.supportCodes,
              context,
              timestamp,
            ),
            audit: {
              action: "diagnostic.observation.record",
              resourceType: "observation_event",
              resourceReference: eventId,
              reasonCode: "INCIDENT_AGGREGATION_DEFERRED",
            },
          }),
        );
        await this.recordFailureEvidence(
          normalized.correlationId,
          normalized.operation,
          "INCIDENT_AGGREGATION_DEFERRED",
        );
      } catch (observationError) {
        await this.recordFailureEvidence(
          normalized.correlationId,
          normalized.operation,
          "OBSERVATION_WRITE_FAILED",
        );
        throw observationError instanceof Error
          ? observationError
          : aggregationError;
      }
    }
    if (this.alerts && result.incident && result.supportCode) {
      try {
        await this.alerts.evaluate(
          result.observation,
          result.incident,
          result.supportCode,
        );
      } catch {
        await this.recordFailureEvidence(
          result.observation.correlationId,
          result.observation.operation,
          "ALERT_SIDE_EFFECT_FAILED",
        );
      }
    }
    return result;
  }

  async reconcileIncidentAggregation(
    eventId: string,
    context: MutationContext,
  ): Promise<Incident | null> {
    assertSafeActor(context);
    const linked = await this.observability.findIncidentForObservation(eventId);
    if (linked) return linked;
    const event = await this.observability.getObservation(eventId);
    if (!event) throw new DomainNotFoundError("OBSERVATION_NOT_FOUND");
    if (event.severity === "info") return null;
    const scope = incidentScopeFor(
      event.reasonCode,
      event.tenantId,
      event.dependencyKey,
    );
    const fingerprint = await sha256Hex(JSON.stringify({
      scope: scope.aggregationScopeKey,
      category: event.reasonCode,
      moduleKey: event.moduleKey,
      operation: event.operation,
      dependencyKey: event.dependencyKey,
      reasonCode: event.reasonCode,
    }));
    const existing = await this.observability.findIncident(
      scope.aggregationScopeKey,
      fingerprint,
    );
    const tenantAlreadyAffected = existing && event.tenantId
      ? await this.observability.incidentHasTenant(existing.incidentId, event.tenantId)
      : false;
    const applicationAlreadyAffected = existing && event.applicationId
      ? await this.observability.incidentHasApplication(
        existing.incidentId,
        event.applicationId,
      )
      : false;
    const normalized = normalizeObservation({
      correlationId: event.correlationId,
      traceId: event.traceId,
      environment: event.environment,
      releaseId: event.releaseId,
      tenantId: event.tenantId,
      applicationId: event.applicationId,
      moduleKey: event.moduleKey,
      operation: event.operation,
      eventType: event.eventType,
      severity: event.severity,
      status: event.status,
      errorCode: event.reasonCode,
      safeMessage: event.safeMessage,
      dependencyKey: event.dependencyKey,
      actorReferenceDigest: event.actorReferenceDigest,
      metadata: {},
    }, this.clock.now().getTime());
    const incident = buildIncident(
      normalized,
      event.reasonCode,
      scope,
      fingerprint,
      existing?.incidentId ?? this.uuidv7.generate(),
      existing,
      Boolean(tenantAlreadyAffected),
      Boolean(applicationAlreadyAffected),
      this.clock.now().getTime(),
    );
    try {
      return await this.executeIdempotent(
        event.tenantId
          ? { scopeType: "tenant", tenantId: event.tenantId }
          : { scopeType: "platform", tenantId: null },
        "observability.reconcile_incident",
        { eventId, fingerprint },
        context,
        (timestamp) => ({
          result: incident,
          statements: [
            existing
              ? this.db.prepare(
                `UPDATE incidents SET title = ?1, severity = ?2, status = ?3,
                   last_seen_at = ?4, occurrence_count = ?5,
                   affected_tenant_count = ?6, affected_application_count = ?7,
                   dependency_key = ?8, release_id = ?9, resolution_code = NULL,
                   resolved_at = NULL, reopen_count = ?10, updated_at = ?11
                 WHERE id = ?12 AND occurrence_count = ?13`,
              ).bind(
                incident.title, incident.severity, incident.status,
                incident.lastSeenAt, incident.occurrenceCount,
                incident.affectedTenantCount, incident.affectedApplicationCount,
                incident.dependencyKey, incident.releaseId, incident.reopenCount,
                timestamp, incident.incidentId, existing.occurrenceCount,
              )
              : this.db.prepare(
                `INSERT INTO incidents (
                  id, scope_type, tenant_id, aggregation_scope_key, fingerprint,
                  title, severity, status, first_seen_at, last_seen_at,
                  occurrence_count, affected_tenant_count,
                  affected_application_count, dependency_key, release_id,
                  owner_reference, resolution_code, resolved_at, reopen_count,
                  created_at, updated_at
                ) VALUES (
                  ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
                  ?13, ?14, ?15, NULL, NULL, NULL, ?16, ?17, ?17
                )`,
              ).bind(
                incident.incidentId, incident.scopeType, incident.tenantId,
                incident.aggregationScopeKey, incident.fingerprint, incident.title,
                incident.severity, incident.status, incident.firstSeenAt,
                incident.lastSeenAt, incident.occurrenceCount,
                incident.affectedTenantCount, incident.affectedApplicationCount,
                incident.dependencyKey, incident.releaseId, incident.reopenCount,
                timestamp,
              ),
            this.db.prepare(
              `INSERT INTO incident_events (
                id, incident_id, observation_event_id, event_kind,
                actor_reference_digest, reason_code, occurred_at, created_at
              ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`,
            ).bind(
              this.uuidv7.generate(), incident.incidentId, eventId,
              existing?.status === "resolved" ? "reopened" : "observed",
              actorDigest(context), event.reasonCode, timestamp,
            ),
          ],
          audit: {
            action: "diagnostic.incident.reconcile",
            resourceType: "observation_event",
            resourceReference: eventId,
            reasonCode: "INCIDENT_AGGREGATION_RECONCILED",
          },
        }),
      );
    } catch (error) {
      const winner = await this.observability.findIncidentForObservation(eventId);
      if (winner) return winner;
      throw error;
    }
  }

  async cleanupExpiredObservations(
    execution: RetentionExecutionScope,
    context: MutationContext,
  ): Promise<RetentionCleanupResult> {
    this.retention.assertExecutionScope(execution);
    if (
      context.actorType !== "service"
      || context.actorReference !== "service:retention-executor"
    ) {
      throw new TenantBoundaryError();
    }
    const now = this.clock.now().getTime();
    const eligible = await this.observability.listRetentionEligible(
      execution.scopeType,
      execution.tenantId,
      now,
      execution.limit,
    );
    const statements: D1PreparedStatement[] = [];
    for (const event of eligible) {
      statements.push(
        this.db.prepare(
          `UPDATE support_code_mappings
           SET correlation_id = NULL, trace_id = NULL,
               observation_event_id = NULL, status = 'expired', expired_at = ?1
           WHERE observation_event_id = ?2 AND tenant_id IS ?3
             AND status = 'active' AND expires_at <= ?1`,
        ).bind(now, event.eventId, event.tenantId),
        this.db.prepare(
          `UPDATE observation_events
           SET correlation_id = 'retained', trace_id = 'retained',
               safe_message = 'Historical observation retained.',
               actor_reference_digest = NULL, metadata_safe_json = '{}',
               retention_status = 'anonymized', anonymized_at = ?1
           WHERE id = ?2 AND tenant_id IS ?3 AND retention_status = 'active'
             AND retention_expires_at <= ?1`,
        ).bind(now, event.eventId, event.tenantId),
      );
    }
    return this.executeIdempotent(
      execution.scopeType === "tenant"
        ? { scopeType: "tenant", tenantId: execution.tenantId as string }
        : { scopeType: "platform", tenantId: null },
      "observability.retention_cleanup",
      { execution },
      context,
      () => ({
        result: Object.freeze({
          eligibleCount: eligible.length,
          anonymizedCount: eligible.length,
        }),
        statements,
        audit: {
          action: "diagnostic.retention.anonymize",
          resourceType: "observation_retention_batch",
          resourceReference: execution.scopeType === "tenant"
            ? `tenant:${execution.tenantId}`
            : "platform",
          reasonCode: "RETENTION_EXPIRED",
        },
      }),
    );
  }

  async getIncident(
    incidentId: string,
    access: DiagnosticAccessContext,
  ): Promise<Incident> {
    assertPermission(access, observabilityPermissions.incidentRead);
    const incident = await this.observability.getIncident(incidentId);
    if (!incident) throw new DomainNotFoundError("INCIDENT_NOT_FOUND");
    assertIncidentScope(access, incident);
    return incident;
  }

  async listIncidents(
    access: DiagnosticAccessContext,
    page: PageRequest = {},
  ): Promise<Page<Incident>> {
    assertPermission(access, observabilityPermissions.incidentRead);
    if (
      !access.permissionKeys.includes(
        observabilityPermissions.diagnosticsReadPlatform,
      )
      && !access.tenantId
    ) {
      throw new TenantBoundaryError();
    }
    return this.observability.listIncidents(access, page);
  }

  async getDiagnosticBySupportCode(
    supportCode: string,
    access: DiagnosticAccessContext,
  ): Promise<SupportCodeDiagnostic> {
    this.supportCodes.validate(supportCode);
    const diagnostic = await this.observability.getDiagnosticBySupportCode(
      supportCode,
      this.clock.now().getTime(),
    );
    if (!diagnostic) throw new DomainNotFoundError("DIAGNOSTIC_NOT_FOUND");
    if (diagnostic.tenantId) {
      const platform = access.permissionKeys.includes(
        observabilityPermissions.diagnosticsReadPlatform,
      );
      const tenant = access.tenantId === diagnostic.tenantId
        && access.permissionKeys.includes(
          observabilityPermissions.diagnosticsReadTenant,
        );
      if (!platform && !tenant) throw new TenantBoundaryError();
    } else {
      assertPermission(
        access,
        observabilityPermissions.diagnosticsReadPlatform,
      );
    }
    return diagnostic;
  }

  async listTenantDiagnostics(
    tenantId: string,
    access: DiagnosticAccessContext,
    page: PageRequest = {},
  ): Promise<Page<ObservationEvent>> {
    const platform = access.permissionKeys.includes(
      observabilityPermissions.diagnosticsReadPlatform,
    );
    if (!platform) {
      assertPermission(
        access,
        observabilityPermissions.diagnosticsReadTenant,
      );
      if (access.tenantId !== tenantId) throw new TenantBoundaryError();
    }
    return this.observability.listTenantDiagnostics(tenantId, page);
  }

  async acknowledgeIncident(
    incidentId: string,
    ownerReference: string,
    access: DiagnosticAccessContext,
    context: MutationContext,
  ): Promise<Incident> {
    assertOwnerReference(ownerReference);
    return this.transitionIncident(
      incidentId,
      "acknowledged",
      ownerReference,
      null,
      access,
      context,
    );
  }

  async resolveIncident(
    incidentId: string,
    resolutionCode: string,
    access: DiagnosticAccessContext,
    context: MutationContext,
  ): Promise<Incident> {
    assertReasonCode(resolutionCode);
    return this.transitionIncident(
      incidentId,
      "resolved",
      null,
      resolutionCode,
      access,
      context,
    );
  }

  async getDependencyHealth(access: DiagnosticAccessContext) {
    if (
      !access.permissionKeys.includes(
        observabilityPermissions.diagnosticsReadPlatform,
      )
      && !access.permissionKeys.includes(
        observabilityPermissions.diagnosticsReadTenant,
      )
    ) {
      throw new TenantBoundaryError();
    }
    if (!this.dependencies) throw new Error("DEPENDENCY_HEALTH_NOT_CONFIGURED");
    return this.dependencies.snapshot();
  }

  async getAlertHistory(
    access: DiagnosticAccessContext,
    page: PageRequest = {},
  ) {
    assertPermission(access, observabilityPermissions.alertRead);
    return this.observability.listAlertHistory(access, page);
  }

  private async recordFailureEvidence(
    correlationId: string,
    operation: string,
    reasonCode: "OBSERVATION_WRITE_FAILED" | "INCIDENT_AGGREGATION_DEFERRED" | "ALERT_SIDE_EFFECT_FAILED",
  ): Promise<void> {
    if (!this.failureEvidence) return;
    try {
      await this.failureEvidence.record(Object.freeze({
        correlationId,
        operation,
        reasonCode,
        occurredAt: this.clock.now().getTime(),
        occurrenceCount: 1,
      }));
    } catch {
      // Failure evidence is itself a sidecar and cannot alter the caller result.
    }
  }

  private async transitionIncident(
    incidentId: string,
    status: Extract<IncidentStatus, "acknowledged" | "resolved">,
    ownerReference: string | null,
    resolutionCode: string | null,
    access: DiagnosticAccessContext,
    context: MutationContext,
  ): Promise<Incident> {
    assertPermission(access, observabilityPermissions.incidentManage);
    assertSafeActor(context);
    const current = await this.observability.getIncident(incidentId);
    if (!current) throw new DomainNotFoundError("INCIDENT_NOT_FOUND");
    assertIncidentScope(access, current);
    const now = this.clock.now().getTime();
    const next: Incident = Object.freeze({
      ...current,
      status,
      ownerReference: ownerReference ?? current.ownerReference,
      resolutionCode,
      resolvedAt: status === "resolved" ? now : null,
      lastSeenAt: Math.max(current.lastSeenAt, now),
    });
    return this.executeIdempotent(
      current.tenantId
        ? { scopeType: "tenant", tenantId: current.tenantId }
        : { scopeType: "platform", tenantId: null },
      `incident.${status}`,
      { incidentId, status, ownerReference, resolutionCode },
      context,
      (timestamp) => ({
        result: next,
        statements: [
          this.db.prepare(
            `UPDATE incidents SET status = ?1, owner_reference = ?2,
               resolution_code = ?3, resolved_at = ?4, updated_at = ?5
             WHERE id = ?6`,
          ).bind(
            status,
            next.ownerReference,
            next.resolutionCode,
            next.resolvedAt,
            timestamp,
            incidentId,
          ),
          this.db.prepare(
            `INSERT INTO incident_events (
              id, incident_id, observation_event_id, event_kind,
              actor_reference_digest, reason_code, occurred_at, created_at
            ) VALUES (?1, ?2, NULL, ?3, ?4, ?5, ?6, ?6)`,
          ).bind(
            this.uuidv7.generate(),
            incidentId,
            status,
            actorDigest(context),
            resolutionCode ?? "INCIDENT_ACKNOWLEDGED",
            timestamp,
          ),
        ],
        audit: {
          action: `incident.${status}`,
          resourceType: "incident",
          resourceReference: incidentId,
          reasonCode: resolutionCode ?? "INCIDENT_ACKNOWLEDGED",
        },
      }),
    );
  }
}

function assertPermission(
  access: DiagnosticAccessContext,
  permission: string,
): void {
  if (!access.permissionKeys.includes(permission)) {
    throw new TenantBoundaryError();
  }
}

function assertIncidentScope(
  access: DiagnosticAccessContext,
  incident: Incident,
): void {
  if (
    access.permissionKeys.includes(
      observabilityPermissions.diagnosticsReadPlatform,
    )
  ) {
    return;
  }
  if (!incident.tenantId || incident.tenantId !== access.tenantId) {
    throw new TenantBoundaryError();
  }
}

function assertSafeActor(context: MutationContext): void {
  if (context.actorType === "platform_user") {
    assertDigest(context.actorReference);
  } else if (!/^service:[a-z0-9._-]{2,100}$/.test(context.actorReference)) {
    throw new TypeError("Unsafe service actor reference");
  }
}

function actorDigest(context: MutationContext): string | null {
  return context.actorType === "platform_user" ? context.actorReference : null;
}

function assertOwnerReference(value: string): void {
  assertBoundedText("ownerReference", value, 128);
  if (!/^digest:[0-9a-f]{64}$/.test(value) && !/^service:[a-z0-9._-]{2,100}$/.test(value)) {
    throw new TypeError("Owner reference must be digested or service-scoped");
  }
}

function assertDigest(value: string): void {
  if (!/^digest:[0-9a-f]{64}$/.test(value)) {
    throw new TypeError("Actor reference must be a digest");
  }
}

function assertReasonCode(value: string): void {
  if (!/^[A-Z0-9_]{2,80}$/.test(value)) {
    throw new TypeError("Invalid reason code");
  }
}

function assertBoundedText(
  name: string,
  value: string,
  max: number,
  min = 1,
): void {
  if (value.trim().length < min || value.length > max) {
    throw new TypeError(`${name} is invalid`);
  }
}

function dependencyStatusFromEvent(eventType: ObservationInput["eventType"]) {
  if (eventType === "dependency.degraded") return "degraded" as const;
  if (eventType === "dependency.unavailable") return "unavailable" as const;
  return undefined;
}

function validationState(errorCode: string) {
  if (errorCode === "INPUT_INCOMPLETE") return "incomplete" as const;
  if (errorCode === "VALIDATION_FAILED" || errorCode === "INVALID_REQUEST") {
    return "invalid" as const;
  }
  return undefined;
}

function maxSeverity(
  left: Incident["severity"],
  right: Incident["severity"],
): Incident["severity"] {
  const rank = { warning: 1, error: 2, critical: 3 };
  return rank[right] > rank[left] ? right : left;
}
