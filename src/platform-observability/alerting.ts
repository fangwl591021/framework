import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import { sha256Hex } from "../persistence/crypto";
import type { EnvironmentName } from "../platform-reliability/models";
import type {
  AlertDeliveryRecord,
  AlertPayload,
  AlertPolicy,
  Incident,
  ObservationEvent,
  ObservationSeverity,
} from "./models";

export interface AlertPolicyPort {
  select(
    event: ObservationEvent,
    incident: Incident,
  ): Promise<AlertPolicy | null>;
}

export interface AlertDeliveryPort {
  readonly providerKey: "local_capture" | "telegram";
  deliver(payload: AlertPayload, deliveryKey: string): Promise<void>;
}

export interface AlertTemplatePort {
  build(
    event: ObservationEvent,
    incident: Incident,
    supportCode: string,
  ): AlertPayload;
}

export interface AlertHistoryPort {
  latestForIncident(incidentId: string): Promise<AlertDeliveryRecord | null>;
  findByDeliveryKey(deliveryKey: string): Promise<AlertDeliveryRecord | null>;
  save(record: AlertDeliveryRecord, safePayloadJson: string): Promise<void>;
}

export interface AlertRetryPort {
  schedule(deliveryId: string, retryAt: number): Promise<void>;
}
export interface AlertFailureEvidencePort {
  latestForIncident(incidentId: string): Promise<AlertDeliveryRecord | null>;
  findByDeliveryKey(deliveryKey: string): Promise<AlertDeliveryRecord | null>;
  save(record: AlertDeliveryRecord): Promise<void>;
}

export interface TelegramAlertConfiguration {
  readonly telegramBotTokenSecretReference: string;
  readonly telegramChatIdReference: string;
  readonly enabled: boolean;
  readonly minimumSeverity: Exclude<ObservationSeverity, "info">;
  readonly environmentAllowlist: readonly EnvironmentName[];
}

export interface TrustedTelegramConfigurationContext {
  readonly source: "trusted_environment_configuration";
  readonly environment: EnvironmentName;
}

export class TelegramConfigurationGuard {
  validate(
    configuration: Partial<TelegramAlertConfiguration>,
    context: TrustedTelegramConfigurationContext,
  ): TelegramAlertConfiguration {
    const secretReference = configuration.telegramBotTokenSecretReference;
    const chatReference = configuration.telegramChatIdReference;
    const environments = configuration.environmentAllowlist;
    if (
      typeof secretReference !== "string"
      || !/^secret:[A-Z][A-Z0-9_]{2,79}$/.test(secretReference)
      || typeof chatReference !== "string"
      || !/^env:[A-Z][A-Z0-9_]{2,79}$/.test(chatReference)
      || typeof configuration.enabled !== "boolean"
      || !["warning", "error", "critical"].includes(
        configuration.minimumSeverity ?? "",
      )
      || !Array.isArray(environments)
      || environments.length === 0
      || environments.some((environment) =>
        !["development", "staging", "production"].includes(environment)
      )
      || context.source !== "trusted_environment_configuration"
      || (
        context.environment === "production"
        && (!configuration.enabled || !environments.includes("production"))
      )
    ) {
      throw new Error("INVALID_TELEGRAM_CONFIGURATION");
    }
    return Object.freeze({
      telegramBotTokenSecretReference: secretReference,
      telegramChatIdReference: chatReference,
      enabled: configuration.enabled,
      minimumSeverity: configuration.minimumSeverity as Exclude<
        ObservationSeverity,
        "info"
      >,
      environmentAllowlist: Object.freeze([...environments]),
    });
  }
}

export class DeterministicAlertTemplate implements AlertTemplatePort {
  build(
    event: ObservationEvent,
    incident: Incident,
    supportCode: string,
  ): AlertPayload {
    return Object.freeze({
      severity: incident.severity,
      environment: event.environment,
      incidentId: incident.incidentId,
      safeTitle: incident.title,
      affectedTenantCount: incident.affectedTenantCount,
      occurrenceCount: incident.occurrenceCount,
      firstSeenAt: incident.firstSeenAt,
      lastSeenAt: incident.lastSeenAt,
      releaseId: incident.releaseId,
      dependencyKey: incident.dependencyKey,
      suggestedOperatorAction: suggestedOperatorAction(incident),
      supportCode,
    });
  }
}

export class LocalCaptureAlertAdapter implements AlertDeliveryPort {
  readonly providerKey = "local_capture";
  private readonly captured: { payload: AlertPayload; deliveryKey: string }[] = [];

  get deliveries(): readonly Readonly<{ payload: AlertPayload; deliveryKey: string }>[] {
    return this.captured;
  }

  async deliver(payload: AlertPayload, deliveryKey: string): Promise<void> {
    this.captured.push(
      Object.freeze({ payload: Object.freeze({ ...payload }), deliveryKey }),
    );
  }
}

export class DisabledTelegramAdapter implements AlertDeliveryPort {
  readonly providerKey = "telegram";

  async deliver(_payload: AlertPayload, _deliveryKey: string): Promise<never> {
    throw new Error("TELEGRAM_PROVIDER_DISABLED");
  }
}

export class LocalAlertRetryAdapter implements AlertRetryPort {
  readonly scheduled = new Map<string, number>();

  async schedule(deliveryId: string, retryAt: number): Promise<void> {
    if (!this.scheduled.has(deliveryId)) this.scheduled.set(deliveryId, retryAt);
  }
}

export class LocalAlertFailureEvidenceAdapter
implements AlertFailureEvidencePort {
  private readonly records = new Map<string, AlertDeliveryRecord>();

  async latestForIncident(incidentId: string): Promise<AlertDeliveryRecord | null> {
    return [...this.records.values()].reverse()
      .find((record) => record.incidentId === incidentId) ?? null;
  }

  async findByDeliveryKey(deliveryKey: string): Promise<AlertDeliveryRecord | null> {
    return this.records.get(deliveryKey) ?? null;
  }

  async save(record: AlertDeliveryRecord): Promise<void> {
    if (!this.records.has(record.deliveryKey)) {
      this.records.set(record.deliveryKey, Object.freeze({ ...record }));
    }
  }
}

export class AlertCoordinator {
  constructor(
    private readonly clock: Clock,
    private readonly uuidv7: UuidV7,
    private readonly policy: AlertPolicyPort,
    private readonly delivery: AlertDeliveryPort,
    private readonly template: AlertTemplatePort,
    private readonly history: AlertHistoryPort,
    private readonly retry: AlertRetryPort,
    private readonly failureEvidence: AlertFailureEvidencePort,
  ) {}

  async evaluate(
    event: ObservationEvent,
    incident: Incident,
    supportCode: string,
  ): Promise<AlertDeliveryRecord | null> {
    const policy = await this.policy.select(event, incident);
    if (!policy?.enabled || event.severity === "info") return null;
    if (!meetsSeverity(event.severity, policy.minimumSeverity)) return null;
    if (event.severity === "warning") return null;
    if (
      event.severity === "error"
      && incident.occurrenceCount < policy.occurrenceThreshold
    ) {
      return null;
    }

    const now = this.clock.now().getTime();
    let latest: AlertDeliveryRecord | null;
    try {
      latest = await this.history.latestForIncident(incident.incidentId);
    } catch {
      latest = null;
    }
    latest ??= await this.failureEvidence.latestForIncident(incident.incidentId);
    const escalated = latest
      ? severityRank(incident.severity) > severityRank(latest.severity)
      : false;
    const inCooldown = latest
      ? now - latest.createdAt < policy.cooldownMs
      : false;
    const window = Math.floor(now / policy.aggregationWindowMs);
    const deliveryKey = await sha256Hex(
      `${incident.incidentId}:${incident.severity}:${window}`,
    );
    let existing: AlertDeliveryRecord | null;
    try {
      existing = await this.history.findByDeliveryKey(deliveryKey);
    } catch {
      existing = null;
    }
    existing ??= await this.failureEvidence.findByDeliveryKey(deliveryKey);
    if (existing) return existing;

    const payload = this.template.build(event, incident, supportCode);
    const payloadJson = JSON.stringify(payload);
    if (payloadJson.length > 2048) {
      throw new TypeError("Alert payload exceeds 2048 bytes");
    }

    if (inCooldown && !escalated) {
      const suppressed = this.record(
        incident,
        deliveryKey,
        "suppressed",
        now,
        null,
      );
      await this.saveEvidence(suppressed, payloadJson);
      return suppressed;
    }

    const deliveryId = this.uuidv7.generate();
    try {
      await this.delivery.deliver(payload, deliveryKey);
    } catch {
      const retryAt = now + Math.max(1_000, policy.escalationDelayMs);
      const failed: AlertDeliveryRecord = Object.freeze({
        deliveryId,
        incidentId: incident.incidentId,
        deliveryKey,
        providerKey: this.delivery.providerKey,
        severity: incident.severity,
        status: "retry_scheduled",
        attemptCount: 1,
        nextRetryAt: retryAt,
        failureReasonCode: "ALERT_DELIVERY_FAILED",
        createdAt: now,
        deliveredAt: null,
      });
      await this.saveEvidence(failed, payloadJson);
      try {
        await this.retry.schedule(deliveryId, retryAt);
      } catch {
        // The durable failure evidence remains the retry source of truth.
      }
      return failed;
    }

    const delivered: AlertDeliveryRecord = Object.freeze({
      deliveryId,
      incidentId: incident.incidentId,
      deliveryKey,
      providerKey: this.delivery.providerKey,
      severity: incident.severity,
      status: "delivered",
      attemptCount: 1,
      nextRetryAt: null,
      failureReasonCode: null,
      createdAt: now,
      deliveredAt: now,
    });
    await this.saveEvidence(delivered, payloadJson);
    return delivered;
  }

  private async saveEvidence(
    record: AlertDeliveryRecord,
    safePayloadJson: string,
  ): Promise<void> {
    try {
      await this.history.save(record, safePayloadJson);
    } catch {
      await this.failureEvidence.save(record);
    }
  }
  private record(
    incident: Incident,
    deliveryKey: string,
    status: "suppressed",
    now: number,
    failureReasonCode: null,
  ): AlertDeliveryRecord {
    return Object.freeze({
      deliveryId: this.uuidv7.generate(),
      incidentId: incident.incidentId,
      deliveryKey,
      providerKey: this.delivery.providerKey,
      severity: incident.severity,
      status,
      attemptCount: 0,
      nextRetryAt: null,
      failureReasonCode,
      createdAt: now,
      deliveredAt: null,
    });
  }
}

export class StaticAlertPolicy implements AlertPolicyPort {
  constructor(private readonly policy: AlertPolicy | null) {}

  async select(
    _event: ObservationEvent,
    _incident: Incident,
  ): Promise<AlertPolicy | null> {
    return this.policy;
  }
}

function severityRank(severity: Exclude<ObservationSeverity, "info">): number {
  return { warning: 1, error: 2, critical: 3 }[severity];
}

function meetsSeverity(
  severity: ObservationSeverity,
  minimum: Exclude<ObservationSeverity, "info">,
): boolean {
  if (severity === "info") return false;
  return severityRank(severity) >= severityRank(minimum);
}

function suggestedOperatorAction(incident: Incident): string {
  if (incident.dependencyKey) return "Verify dependency health and retry policy.";
  if (incident.severity === "critical") return "Follow the critical incident runbook.";
  return "Review safe diagnostic evidence and acknowledge the Incident.";
}
