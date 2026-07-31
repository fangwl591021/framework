import type { MutationContext } from "../application/core-application-base";
import type { UuidV7 } from "../core/uuidv7";
import { TenantBoundaryError } from "../persistence/models";
import type { ObservationEvent, ObservationInput, Incident } from "./models";
import { SupportCodeCodec } from "./support-code";

const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_METADATA_BYTES = 512;
const FORBIDDEN_METADATA_KEY =
  /(authorization|cookie|secret|token|password|request.?body|response.?body|raw.*(?:uid|subject)|qr)/i;
const FORBIDDEN_METADATA_VALUE =
  /(bearer\s+[a-z0-9._-]+|-----BEGIN|client_secret|access_token|refresh_token)/i;
type NormalizedObservation = Required<Omit<
  ObservationInput,
  "metadata" | "retentionMs"
>> & {
  readonly metadataSafeJson: string;
  readonly retentionMs: number;
};

export function normalizeObservation(
  input: ObservationInput,
  now: number,
): NormalizedObservation {
  assertBoundedText("correlationId", input.correlationId, 255, 8);
  assertBoundedText("traceId", input.traceId, 255, 8);
  assertBoundedText("releaseId", input.releaseId, 80);
  assertBoundedText("moduleKey", input.moduleKey, 80);
  assertBoundedText("operation", input.operation, 100);
  assertReasonCode(input.errorCode);
  assertBoundedText("safeMessage", input.safeMessage, 500);
  if (input.applicationId && !input.tenantId) {
    throw new TenantBoundaryError();
  }
  if (input.actorReferenceDigest) assertDigest(input.actorReferenceDigest);
  const metadataSafeJson = safeMetadata(input.metadata ?? {});
  const retentionMs = Math.max(
    60_000,
    Math.min(input.retentionMs ?? DEFAULT_RETENTION_MS, DEFAULT_RETENTION_MS),
  );
  return Object.freeze({
    ...input,
    tenantId: input.tenantId ?? null,
    applicationId: input.applicationId ?? null,
    dependencyKey: input.dependencyKey ?? null,
    actorReferenceDigest: input.actorReferenceDigest ?? null,
    metadataSafeJson,
    retentionMs,
  });
}

export function buildObservation(
  input: NormalizedObservation,
  reasonCode: string,
  eventId: string,
  existing: ObservationEvent | null,
  now: number,
): ObservationEvent {
  return Object.freeze({
    eventId,
    correlationId: existing?.correlationId ?? input.correlationId,
    traceId: existing?.traceId ?? input.traceId,
    timestamp: existing?.timestamp ?? now,
    environment: input.environment,
    releaseId: input.releaseId,
    tenantId: input.tenantId,
    applicationId: input.applicationId,
    moduleKey: input.moduleKey,
    operation: input.operation,
    eventType: input.eventType,
    severity: input.severity,
    status: input.status,
    reasonCode,
    safeMessage: input.safeMessage,
    dependencyKey: input.dependencyKey,
    actorReferenceDigest: input.actorReferenceDigest,
    occurrenceCount: (existing?.occurrenceCount ?? 0) + 1,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
    metadataSafeJson: existing?.metadataSafeJson ?? input.metadataSafeJson,
    retentionExpiresAt: existing?.retentionExpiresAt ?? now + input.retentionMs,
    retentionStatus: existing?.retentionStatus ?? "active",
    anonymizedAt: existing?.anonymizedAt ?? null,
  });
}

export function buildIncident(
  input: NormalizedObservation,
  category: string,
  scope: ReturnType<typeof incidentScopeFor>,
  fingerprint: string,
  incidentId: string,
  existing: Incident | null,
  tenantAlreadyAffected: boolean,
  applicationAlreadyAffected: boolean,
  now: number,
): Incident {
  const severity = input.severity === "info" ? "warning" : input.severity;
  return Object.freeze({
    incidentId,
    scopeType: scope.scopeType,
    tenantId: scope.scopeType === "tenant" ? input.tenantId : null,
    aggregationScopeKey: scope.aggregationScopeKey,
    fingerprint,
    title: `Diagnostic incident: ${category}`,
    severity: existing
      ? maxSeverity(existing.severity, severity)
      : severity,
    status: existing?.status === "resolved" ? "open" : existing?.status ?? "open",
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
    occurrenceCount: (existing?.occurrenceCount ?? 0) + 1,
    affectedTenantCount: (existing?.affectedTenantCount ?? 0)
      + (input.tenantId && !tenantAlreadyAffected ? 1 : 0),
    affectedApplicationCount: (existing?.affectedApplicationCount ?? 0)
      + (input.applicationId && !applicationAlreadyAffected ? 1 : 0),
    dependencyKey: input.dependencyKey,
    releaseId: input.releaseId,
    ownerReference: existing?.ownerReference ?? null,
    resolutionCode: null,
    resolvedAt: null,
    reopenCount: (existing?.reopenCount ?? 0)
      + (existing?.status === "resolved" ? 1 : 0),
  });
}

export function buildObservationStatements(
  db: D1Database,
  observation: ObservationEvent,
  existingObservation: ObservationEvent | null,
  incident: Incident | null,
  existingIncident: Incident | null,
  supportCode: string | null,
  uuidv7: UuidV7,
  supportCodes: SupportCodeCodec,
  context: MutationContext,
  timestamp: number,
): readonly D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];
  statements.push(existingObservation
    ? db.prepare(
      `UPDATE observation_events
       SET occurrence_count = ?1, last_seen_at = ?2
       WHERE id = ?3 AND occurrence_count = ?4`,
    ).bind(
      observation.occurrenceCount,
      observation.lastSeenAt,
      observation.eventId,
      existingObservation.occurrenceCount,
    )
    : db.prepare(
      `INSERT INTO observation_events (
        id, correlation_id, trace_id, observed_at, environment, release_id,
        tenant_id, application_id, module_key, operation, event_type, severity,
        status, reason_code, safe_message, dependency_key,
        actor_reference_digest, occurrence_count, first_seen_at, last_seen_at,
        metadata_safe_json, retention_expires_at, retention_status, anonymized_at, created_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
        ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25
      )`,
    ).bind(
      observation.eventId,
      observation.correlationId,
      observation.traceId,
      observation.timestamp,
      observation.environment,
      observation.releaseId,
      observation.tenantId,
      observation.applicationId,
      observation.moduleKey,
      observation.operation,
      observation.eventType,
      observation.severity,
      observation.status,
      observation.reasonCode,
      observation.safeMessage,
      observation.dependencyKey,
      observation.actorReferenceDigest,
      observation.occurrenceCount,
      observation.firstSeenAt,
      observation.lastSeenAt,
      observation.metadataSafeJson,
      observation.retentionExpiresAt,
      observation.retentionStatus,
      observation.anonymizedAt,
      timestamp,
    ));

  if (incident) {
    statements.push(existingIncident
      ? db.prepare(
        `UPDATE incidents SET title = ?1, severity = ?2, status = ?3,
           last_seen_at = ?4, occurrence_count = ?5,
           affected_tenant_count = ?6, affected_application_count = ?7,
           dependency_key = ?8, release_id = ?9, resolution_code = NULL,
           resolved_at = NULL, reopen_count = ?10, updated_at = ?11
         WHERE id = ?12 AND occurrence_count = ?13`,
      ).bind(
        incident.title,
        incident.severity,
        incident.status,
        incident.lastSeenAt,
        incident.occurrenceCount,
        incident.affectedTenantCount,
        incident.affectedApplicationCount,
        incident.dependencyKey,
        incident.releaseId,
        incident.reopenCount,
        timestamp,
        incident.incidentId,
        existingIncident.occurrenceCount,
      )
      : db.prepare(
        `INSERT INTO incidents (
          id, scope_type, tenant_id, aggregation_scope_key, fingerprint, title,
          severity, status, first_seen_at, last_seen_at, occurrence_count,
          affected_tenant_count, affected_application_count, dependency_key,
          release_id, owner_reference, resolution_code, resolved_at,
          reopen_count, created_at, updated_at
        ) VALUES (
          ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
          ?15, ?16, ?17, ?18, ?19, ?20, ?20
        )`,
      ).bind(
        incident.incidentId,
        incident.scopeType,
        incident.tenantId,
        incident.aggregationScopeKey,
        incident.fingerprint,
        incident.title,
        incident.severity,
        incident.status,
        incident.firstSeenAt,
        incident.lastSeenAt,
        incident.occurrenceCount,
        incident.affectedTenantCount,
        incident.affectedApplicationCount,
        incident.dependencyKey,
        incident.releaseId,
        incident.ownerReference,
        incident.resolutionCode,
        incident.resolvedAt,
        incident.reopenCount,
        timestamp,
      ));
    if (!existingObservation) {
      statements.push(db.prepare(
        `INSERT INTO incident_events (
          id, incident_id, observation_event_id, event_kind,
          actor_reference_digest, reason_code, occurred_at, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`,
      ).bind(
        uuidv7.generate(),
        incident.incidentId,
        observation.eventId,
        existingIncident?.status === "resolved" ? "reopened" : "observed",
        actorDigest(context),
        observation.reasonCode,
        timestamp,
      ));
    }
  }
  if (supportCode && !existingObservation) {
    statements.push(db.prepare(
      `INSERT INTO support_code_mappings (
        support_code, correlation_id, trace_id, tenant_id,
        observation_event_id, created_at, expires_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    ).bind(
      supportCode,
      observation.correlationId,
      observation.traceId,
      observation.tenantId,
      observation.eventId,
      timestamp,
      supportCodes.expiresAt(timestamp),
    ));
  }
  return statements;
}

export function incidentScopeFor(
  category: string,
  tenantId: string | null,
  dependencyKey: string | null,
): {
  readonly scopeType: "platform" | "tenant" | "provider";
  readonly aggregationScopeKey: string;
} {
  if (
    ["EXTERNAL_PROVIDER_DEGRADED", "EXTERNAL_PROVIDER_UNAVAILABLE"].includes(
      category,
    )
    && dependencyKey
  ) {
    return {
      scopeType: "provider",
      aggregationScopeKey: `provider:${dependencyKey}`,
    };
  }
  if (
    tenantId
    && [
      "USER_INPUT_INCOMPLETE",
      "USER_INPUT_INVALID",
      "PERMISSION_DENIED",
      "MODULE_NOT_ENABLED",
      "TENANT_CONFIGURATION_ERROR",
      "APPLICATION_CONFIGURATION_ERROR",
    ].includes(category)
  ) {
    return {
      scopeType: "tenant",
      aggregationScopeKey: `tenant:${tenantId}`,
    };
  }
  return { scopeType: "platform", aggregationScopeKey: "platform" };
}

function safeMetadata(
  metadata: Readonly<Record<string, string | number | boolean | null>>,
): string {
  const entries = Object.entries(metadata);
  if (entries.length > 20) throw new TypeError("Diagnostic metadata is unbounded");
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(key) || FORBIDDEN_METADATA_KEY.test(key)) {
      throw new TypeError("Diagnostic metadata key is forbidden");
    }
    if (typeof value === "string") {
      if (value.length > 160 || FORBIDDEN_METADATA_VALUE.test(value)) {
        throw new TypeError("Diagnostic metadata value is forbidden");
      }
    }
    safe[key] = value;
  }
  const json = JSON.stringify(safe);
  if (json.length > MAX_METADATA_BYTES) {
    throw new TypeError("Diagnostic metadata exceeds bounded size");
  }
  return json;
}


function actorDigest(context: MutationContext): string | null {
  return context.actorType === "platform_user" ? context.actorReference : null;
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

function assertBoundedText(name: string, value: string, max: number, min = 1): void {
  if (value.trim().length < min || value.length > max) {
    throw new TypeError(`${name} is invalid`);
  }
}

function maxSeverity(
  left: Incident["severity"],
  right: Incident["severity"],
): Incident["severity"] {
  const rank = { warning: 1, error: 2, critical: 3 };
  return rank[right] > rank[left] ? right : left;
}