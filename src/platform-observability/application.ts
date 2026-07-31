import {
  CoreApplicationBase,
  type MutationContext,
} from "../application/core-application-base";
import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import type { IdentityDigestKeyProvider } from "../persistence/crypto";
import { sha256Hex } from "../persistence/crypto";
import { DomainNotFoundError, TenantBoundaryError } from "../persistence/models";
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

  constructor(
    db: D1Database,
    clock: Clock,
    uuidv7: UuidV7,
    identityKeys: IdentityDigestKeyProvider,
    private readonly alerts: AlertCoordinator | null = null,
    private readonly dependencies: DependencyStatusAggregator | null = null,
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

    const result = await this.executeIdempotent(
      normalized.tenantId
        ? { scopeType: "tenant", tenantId: normalized.tenantId }
        : { scopeType: "platform", tenantId: null },
      "observability.observe",
      {
        ...normalized,
        metadata: observation.metadataSafeJson,
        category: classification.category,
      },
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

    if (this.alerts && result.incident && result.supportCode) {
      try {
        await this.alerts.evaluate(
          result.observation,
          result.incident,
          result.supportCode,
        );
      } catch {
        // Alert persistence and delivery are isolated from the observed operation.
      }
    }
    return result;
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
