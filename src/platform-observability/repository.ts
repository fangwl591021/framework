import type { AlertHistoryPort } from "./alerting";
import type {
  AlertDeliveryRecord,
  DiagnosticAccessContext,
  Incident,
  ObservationEvent,
  Page,
  PageRequest,
} from "./models";

type ObservationRow = {
  id: string;
  correlation_id: string;
  trace_id: string;
  observed_at: number;
  environment: ObservationEvent["environment"];
  release_id: string;
  tenant_id: string | null;
  application_id: string | null;
  module_key: string;
  operation: string;
  event_type: ObservationEvent["eventType"];
  severity: ObservationEvent["severity"];
  status: ObservationEvent["status"];
  reason_code: string;
  safe_message: string;
  dependency_key: string | null;
  actor_reference_digest: string | null;
  occurrence_count: number;
  first_seen_at: number;
  last_seen_at: number;
  metadata_safe_json: string;
  retention_expires_at: number;
  retention_status: ObservationEvent["retentionStatus"];
  anonymized_at: number | null;
};

type IncidentRow = {
  id: string;
  scope_type: Incident["scopeType"];
  tenant_id: string | null;
  aggregation_scope_key: string;
  fingerprint: string;
  title: string;
  severity: Incident["severity"];
  status: Incident["status"];
  first_seen_at: number;
  last_seen_at: number;
  occurrence_count: number;
  affected_tenant_count: number;
  affected_application_count: number;
  dependency_key: string | null;
  release_id: string;
  owner_reference: string | null;
  resolution_code: string | null;
  resolved_at: number | null;
  reopen_count: number;
};

type AlertRow = {
  id: string;
  incident_id: string;
  delivery_key: string;
  provider_key: AlertDeliveryRecord["providerKey"];
  severity: AlertDeliveryRecord["severity"];
  status: AlertDeliveryRecord["status"];
  attempt_count: number;
  next_retry_at: number | null;
  failure_reason_code: string | null;
  created_at: number;
  delivered_at: number | null;
};

export interface SupportCodeDiagnostic {
  readonly supportCode: string;
  readonly correlationId: string;
  readonly traceId: string;
  readonly tenantId: string | null;
  readonly observation: ObservationEvent;
}

export interface ObservabilityRepository {
  getObservation(eventId: string): Promise<ObservationEvent | null>;
  findAggregatedObservation(
    tenantId: string | null,
    input: Pick<
      ObservationEvent,
      "moduleKey" | "operation" | "eventType" | "reasonCode" | "dependencyKey"
    >,
    since: number,
  ): Promise<ObservationEvent | null>;
  findIncident(
    aggregationScopeKey: string,
    fingerprint: string,
  ): Promise<Incident | null>;
  getIncident(incidentId: string): Promise<Incident | null>;
  incidentHasTenant(incidentId: string, tenantId: string): Promise<boolean>;
  incidentHasApplication(
    incidentId: string,
    applicationId: string,
  ): Promise<boolean>;
  findSupportCodeForObservation(eventId: string): Promise<string | null>;
  getDiagnosticBySupportCode(
    supportCode: string,
    now: number,
  ): Promise<SupportCodeDiagnostic | null>;
  findIncidentForObservation(eventId: string): Promise<Incident | null>;
  listRetentionEligible(
    scopeType: "platform" | "tenant",
    tenantId: string | null,
    now: number,
    limit: number,
  ): Promise<readonly ObservationEvent[]>;
  listIncidents(
    access: DiagnosticAccessContext,
    page: PageRequest,
  ): Promise<Page<Incident>>;
  listTenantDiagnostics(
    tenantId: string,
    page: PageRequest,
  ): Promise<Page<ObservationEvent>>;
  listAlertHistory(
    access: DiagnosticAccessContext,
    page: PageRequest,
  ): Promise<Page<AlertDeliveryRecord>>;
}

export class D1ObservabilityRepository
implements ObservabilityRepository, AlertHistoryPort {
  constructor(private readonly db: D1Database) {}

  async getObservation(eventId: string): Promise<ObservationEvent | null> {
    const row = await this.db.prepare(
      `${OBSERVATION_SELECT} WHERE id = ?1`,
    ).bind(eventId).first<ObservationRow>();
    return row ? observation(row) : null;
  }

  async findAggregatedObservation(
    tenantId: string | null,
    input: Pick<
      ObservationEvent,
      "moduleKey" | "operation" | "eventType" | "reasonCode" | "dependencyKey"
    >,
    since: number,
  ): Promise<ObservationEvent | null> {
    const row = await this.db.prepare(
      `${OBSERVATION_SELECT}
       WHERE tenant_id IS ?1 AND module_key = ?2 AND operation = ?3
         AND event_type = ?4 AND reason_code = ?5 AND dependency_key IS ?6
         AND last_seen_at >= ?7
       ORDER BY last_seen_at DESC, id DESC LIMIT 1`,
    ).bind(
      tenantId,
      input.moduleKey,
      input.operation,
      input.eventType,
      input.reasonCode,
      input.dependencyKey,
      since,
    ).first<ObservationRow>();
    return row ? observation(row) : null;
  }

  async findIncident(
    aggregationScopeKey: string,
    fingerprint: string,
  ): Promise<Incident | null> {
    const row = await this.db.prepare(
      `${INCIDENT_SELECT}
       WHERE aggregation_scope_key = ?1 AND fingerprint = ?2`,
    ).bind(aggregationScopeKey, fingerprint).first<IncidentRow>();
    return row ? incident(row) : null;
  }

  async getIncident(incidentId: string): Promise<Incident | null> {
    const row = await this.db.prepare(
      `${INCIDENT_SELECT} WHERE id = ?1`,
    ).bind(incidentId).first<IncidentRow>();
    return row ? incident(row) : null;
  }

  async incidentHasTenant(
    incidentId: string,
    tenantId: string,
  ): Promise<boolean> {
    const row = await this.db.prepare(
      `SELECT 1 AS found
       FROM incident_events AS link
       JOIN observation_events AS observation
         ON observation.id = link.observation_event_id
       WHERE link.incident_id = ?1 AND observation.tenant_id = ?2
       LIMIT 1`,
    ).bind(incidentId, tenantId).first<{ found: number }>();
    return row?.found === 1;
  }

  async incidentHasApplication(
    incidentId: string,
    applicationId: string,
  ): Promise<boolean> {
    const row = await this.db.prepare(
      `SELECT 1 AS found
       FROM incident_events AS link
       JOIN observation_events AS observation
         ON observation.id = link.observation_event_id
       WHERE link.incident_id = ?1 AND observation.application_id = ?2
       LIMIT 1`,
    ).bind(incidentId, applicationId).first<{ found: number }>();
    return row?.found === 1;
  }

  async findSupportCodeForObservation(eventId: string): Promise<string | null> {
    return await this.db.prepare(
      `SELECT support_code FROM support_code_mappings
       WHERE observation_event_id = ?1 AND status = 'active' LIMIT 1`,
    ).bind(eventId).first<string>("support_code") ?? null;
  }

  async getDiagnosticBySupportCode(
    supportCode: string,
    now: number,
  ): Promise<SupportCodeDiagnostic | null> {
    const row = await this.db.prepare(
      `SELECT mapping.support_code, mapping.correlation_id AS mapping_correlation_id,
              mapping.trace_id AS mapping_trace_id,
              mapping.tenant_id AS mapping_tenant_id,
              observation.id, observation.correlation_id, observation.trace_id,
              observation.observed_at, observation.environment,
              observation.release_id, observation.tenant_id,
              observation.application_id, observation.module_key,
              observation.operation, observation.event_type,
              observation.severity, observation.status,
              observation.reason_code, observation.safe_message,
              observation.dependency_key, observation.actor_reference_digest,
              observation.occurrence_count, observation.first_seen_at,
              observation.last_seen_at, observation.metadata_safe_json,
              observation.retention_expires_at, observation.retention_status,
              observation.anonymized_at
       FROM support_code_mappings AS mapping
       JOIN observation_events AS observation
         ON observation.id = mapping.observation_event_id
       WHERE mapping.support_code = ?1 AND mapping.status = 'active'
         AND mapping.expires_at > ?2`,
    ).bind(supportCode, now).first<ObservationRow & {
      support_code: string;
      mapping_correlation_id: string;
      mapping_trace_id: string;
      mapping_tenant_id: string | null;
    }>();
    if (!row) return null;
    return Object.freeze({
      supportCode: row.support_code,
      correlationId: row.mapping_correlation_id,
      traceId: row.mapping_trace_id,
      tenantId: row.mapping_tenant_id,
      observation: observation(row),
    });
  }

  async findIncidentForObservation(eventId: string): Promise<Incident | null> {
    const incidentId = await this.db.prepare(
      `SELECT incident_id FROM incident_events
       WHERE observation_event_id = ?1
       ORDER BY occurred_at DESC, id DESC LIMIT 1`,
    ).bind(eventId).first<string>("incident_id");
    return incidentId ? this.getIncident(incidentId) : null;
  }

  async listRetentionEligible(
    scopeType: "platform" | "tenant",
    tenantId: string | null,
    now: number,
    limit: number,
  ): Promise<readonly ObservationEvent[]> {
    const result = await this.db.prepare(
      `${OBSERVATION_SELECT}
       WHERE retention_status = 'active' AND retention_expires_at <= ?1
         AND (?2 = 'platform' OR tenant_id = ?3)
       ORDER BY retention_expires_at, id LIMIT ?4`,
    ).bind(now, scopeType, tenantId, limit).all<ObservationRow>();
    return Object.freeze(result.results.map(observation));
  }
  async listIncidents(
    access: DiagnosticAccessContext,
    page: PageRequest,
  ): Promise<Page<Incident>> {
    const { limit, cursor } = boundedPage(page);
    const tenantRestricted = !access.permissionKeys.includes(
      "diagnostics:read_platform",
    );
    const result = await this.db.prepare(
      `${INCIDENT_SELECT}
       WHERE (?1 = 0 OR tenant_id = ?2)
         AND (?3 IS NULL OR id < ?3)
       ORDER BY id DESC LIMIT ?4`,
    ).bind(
      tenantRestricted ? 1 : 0,
      access.tenantId,
      cursor,
      limit + 1,
    ).all<IncidentRow>();
    return pageResult(result.results.map(incident), limit, ({ incidentId }) =>
      incidentId
    );
  }

  async listTenantDiagnostics(
    tenantId: string,
    page: PageRequest,
  ): Promise<Page<ObservationEvent>> {
    const { limit, cursor } = boundedPage(page);
    const result = await this.db.prepare(
      `${OBSERVATION_SELECT}
       WHERE tenant_id = ?1 AND (?2 IS NULL OR id < ?2)
       ORDER BY id DESC LIMIT ?3`,
    ).bind(tenantId, cursor, limit + 1).all<ObservationRow>();
    return pageResult(result.results.map(observation), limit, ({ eventId }) =>
      eventId
    );
  }

  async latestForIncident(
    incidentId: string,
  ): Promise<AlertDeliveryRecord | null> {
    const row = await this.db.prepare(
      `${ALERT_SELECT}
       WHERE delivery.incident_id = ?1 ORDER BY delivery.created_at DESC,
         delivery.id DESC LIMIT 1`,
    ).bind(incidentId).first<AlertRow>();
    return row ? alert(row) : null;
  }

  async findByDeliveryKey(
    deliveryKey: string,
  ): Promise<AlertDeliveryRecord | null> {
    const row = await this.db.prepare(
      `${ALERT_SELECT} WHERE delivery.delivery_key = ?1`,
    ).bind(deliveryKey).first<AlertRow>();
    return row ? alert(row) : null;
  }

  async save(
    record: AlertDeliveryRecord,
    safePayloadJson: string,
  ): Promise<void> {
    await this.db.prepare(
      `INSERT INTO alert_delivery_records (
        id, incident_id, alert_policy_id, delivery_key, provider_key,
        severity, status, attempt_count, next_retry_at, safe_payload_json,
        failure_reason_code, created_at, updated_at, delivered_at
      ) VALUES (
        ?1, ?2, NULL, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, ?12
      )`,
    ).bind(
      record.deliveryId,
      record.incidentId,
      record.deliveryKey,
      record.providerKey,
      record.severity,
      record.status,
      record.attemptCount,
      record.nextRetryAt,
      safePayloadJson,
      record.failureReasonCode,
      record.createdAt,
      record.deliveredAt,
    ).run();
  }

  async listAlertHistory(
    access: DiagnosticAccessContext,
    page: PageRequest,
  ): Promise<Page<AlertDeliveryRecord>> {
    const { limit, cursor } = boundedPage(page);
    const platform = access.permissionKeys.includes("diagnostics:read_platform");
    const result = await this.db.prepare(
      `${ALERT_SELECT}
       JOIN incidents AS incident ON incident.id = delivery.incident_id
       WHERE (?1 = 1 OR incident.tenant_id = ?2)
         AND (?3 IS NULL OR delivery.id < ?3)
       ORDER BY delivery.id DESC LIMIT ?4`,
    ).bind(platform ? 1 : 0, access.tenantId, cursor, limit + 1)
      .all<AlertRow>();
    return pageResult(result.results.map(alert), limit, ({ deliveryId }) =>
      deliveryId
    );
  }
}

const OBSERVATION_SELECT = `SELECT id, correlation_id, trace_id, observed_at,
  environment, release_id, tenant_id, application_id, module_key, operation,
  event_type, severity, status, reason_code, safe_message, dependency_key,
  actor_reference_digest, occurrence_count, first_seen_at, last_seen_at,
  metadata_safe_json, retention_expires_at, retention_status, anonymized_at
  FROM observation_events`;

const INCIDENT_SELECT = `SELECT id, scope_type, tenant_id, aggregation_scope_key,
  fingerprint, title, severity, status, first_seen_at, last_seen_at,
  occurrence_count, affected_tenant_count, affected_application_count,
  dependency_key, release_id, owner_reference, resolution_code, resolved_at,
  reopen_count
  FROM incidents`;

const ALERT_SELECT = `SELECT delivery.id, delivery.incident_id,
  delivery.delivery_key, delivery.provider_key, delivery.severity,
  delivery.status, delivery.attempt_count, delivery.next_retry_at,
  delivery.failure_reason_code, delivery.created_at, delivery.delivered_at
  FROM alert_delivery_records AS delivery`;

function observation(row: ObservationRow): ObservationEvent {
  return Object.freeze({
    eventId: row.id,
    correlationId: row.correlation_id,
    traceId: row.trace_id,
    timestamp: row.observed_at,
    environment: row.environment,
    releaseId: row.release_id,
    tenantId: row.tenant_id,
    applicationId: row.application_id,
    moduleKey: row.module_key,
    operation: row.operation,
    eventType: row.event_type,
    severity: row.severity,
    status: row.status,
    reasonCode: row.reason_code,
    safeMessage: row.safe_message,
    dependencyKey: row.dependency_key,
    actorReferenceDigest: row.actor_reference_digest,
    occurrenceCount: row.occurrence_count,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    metadataSafeJson: row.metadata_safe_json,
    retentionExpiresAt: row.retention_expires_at,
    retentionStatus: row.retention_status,
    anonymizedAt: row.anonymized_at,
  });
}

function incident(row: IncidentRow): Incident {
  return Object.freeze({
    incidentId: row.id,
    scopeType: row.scope_type,
    tenantId: row.tenant_id,
    aggregationScopeKey: row.aggregation_scope_key,
    fingerprint: row.fingerprint,
    title: row.title,
    severity: row.severity,
    status: row.status,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    occurrenceCount: row.occurrence_count,
    affectedTenantCount: row.affected_tenant_count,
    affectedApplicationCount: row.affected_application_count,
    dependencyKey: row.dependency_key,
    releaseId: row.release_id,
    ownerReference: row.owner_reference,
    resolutionCode: row.resolution_code,
    resolvedAt: row.resolved_at,
    reopenCount: row.reopen_count,
  });
}

function alert(row: AlertRow): AlertDeliveryRecord {
  return Object.freeze({
    deliveryId: row.id,
    incidentId: row.incident_id,
    deliveryKey: row.delivery_key,
    providerKey: row.provider_key,
    severity: row.severity,
    status: row.status,
    attemptCount: row.attempt_count,
    nextRetryAt: row.next_retry_at,
    failureReasonCode: row.failure_reason_code,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
  });
}

function boundedPage(page: PageRequest): {
  readonly limit: number;
  readonly cursor: string | null;
} {
  return {
    limit: Math.max(1, Math.min(page.limit ?? 50, 100)),
    cursor: page.cursor ?? null,
  };
}

function pageResult<T>(
  rows: readonly T[],
  limit: number,
  cursor: (item: T) => string,
): Page<T> {
  const items = rows.slice(0, limit);
  return Object.freeze({
    items: Object.freeze(items),
    nextCursor: rows.length > limit && items.length
      ? cursor(items[items.length - 1] as T)
      : null,
  });
}
