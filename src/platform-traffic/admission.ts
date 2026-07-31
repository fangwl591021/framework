import { runtimeSupportCode } from "../platform-observability/support-code";
import type {
  AdmissionResult,
  TrafficObservation,
  TrustedAdmissionContext,
  WebhookEventFingerprint,
  WebhookSignatureEvidence,
} from "./models";
import type {
  AdmissionModuleGatePort,
  AdmissionPermissionPort,
  CircuitBreakerPort,
  LoadSheddingPort,
  RateLimiterPort,
  TenantResourceIsolationPort,
  TrafficObservationPort,
  WebhookDeduplicationPort,
} from "./ports";

export interface TrafficAdmissionRequest {
  readonly context: TrustedAdmissionContext;
  readonly correlationId: string;
  readonly webhook?: Readonly<{
    signature: WebhookSignatureEvidence;
    fingerprint: WebhookEventFingerprint;
  }>;
}

export class TrafficAdmissionGuard {
  constructor(
    private readonly deduplication: WebhookDeduplicationPort,
    private readonly rateLimiter: RateLimiterPort,
    private readonly resources: TenantResourceIsolationPort,
    private readonly circuit: CircuitBreakerPort,
    private readonly loadShedding: LoadSheddingPort,
    private readonly moduleGate: AdmissionModuleGatePort,
    private readonly permission: AdmissionPermissionPort,
    private readonly observations: TrafficObservationPort,
  ) {}

  async admit(request: TrafficAdmissionRequest): Promise<AdmissionResult> {
    const context = request.context;
    if (context.source !== "trusted_runtime_context") {
      return this.result("rejected", "DEPENDENCY_UNAVAILABLE", request.correlationId, false, null);
    }
    if (request.webhook) {
      if (
        request.webhook.signature.source !== "trusted_signature_verifier"
        || !request.webhook.signature.verified
      ) {
        return this.result("rejected", "DEPENDENCY_UNAVAILABLE", request.correlationId, false, null);
      }
      if (request.webhook.fingerprint.tenantId !== context.tenantId) {
        return this.result("rejected", "PERMISSION_DENIED", request.correlationId, false, null);
      }
      try {
        const replay = await this.deduplication.claim(request.webhook.fingerprint);
        if (replay.status === "fingerprint_conflict") {
          await this.observeSafe({
            eventType: "webhook.fingerprint_conflict",
            tenantId: context.tenantId,
            operation: context.routeKey,
            reasonCode: "EVENT_FINGERPRINT_CONFLICT",
            severity: "error",
          });
          return this.result("rejected", "EVENT_FINGERPRINT_CONFLICT", request.correlationId, false, null);
        }
        if (replay.status === "duplicate_replay") {
          if (replay.safeResult === null) {
            return this.result("shed", "REQUEST_DEFERRED", request.correlationId, true, 1);
          }
          await this.observeSafe({
            eventType: "webhook.duplicate",
            tenantId: context.tenantId,
            operation: context.routeKey,
            reasonCode: "DUPLICATE_EVENT",
            severity: "info",
          });
          return this.result("duplicate_replay", "DUPLICATE_EVENT", request.correlationId, false, null);
        }
      } catch {
        return this.result("dependency_unavailable", "DEPENDENCY_UNAVAILABLE", request.correlationId, true, 1);
      }
    }
    const rate = await failSafe(() => this.rateLimiter.evaluate(context));
    if (!rate?.admitted) {
      const platformRate = rate?.reasonCode === "PLATFORM_RATE_LIMITED";
      await this.observeSafe({
        eventType: platformRate ? "traffic.platform_throttled" : "traffic.rate_limited",
        tenantId: platformRate ? null : context.tenantId,
        operation: context.routeKey,
        reasonCode: rate?.reasonCode ?? "RATE_LIMIT_GUARD_UNAVAILABLE",
        severity: platformRate ? "error" : "warning",
      });
      return this.result(
        "throttled",
        platformRate ? "RATE_LIMITED" : "TENANT_RATE_LIMITED",
        request.correlationId,
        true,
        rate?.retryAfterSeconds ?? 1,
      );
    }
    const resource = await failSafe(() => this.resources.evaluate(context));
    if (!resource?.admitted) {
      const platform = resource?.reasonCode === "PLATFORM_BUDGET_EXHAUSTED";
      await this.observeSafe({
        eventType: platform ? "traffic.platform_throttled" : "traffic.tenant_throttled",
        tenantId: platform ? null : context.tenantId,
        operation: context.routeKey,
        reasonCode: resource?.reasonCode ?? "RESOURCE_GUARD_UNAVAILABLE",
        severity: platform ? "error" : "warning",
      });
      return this.result(
        "throttled",
        platform ? "PLATFORM_BUSY" : "TENANT_RATE_LIMITED",
        request.correlationId,
        true,
        resource?.retryAfterSeconds ?? 1,
      );
    }
    const circuit = await failSafe(() => this.circuit.evaluate(context));
    if (!circuit?.admitted) {
      return this.result("circuit_open", "CIRCUIT_OPEN", request.correlationId, true, circuit?.retryAfterSeconds ?? 1);
    }
    const shed = await failSafe(() => this.loadShedding.evaluate(context));
    if (!shed?.admitted) {
      if (shed?.deferred) {
        await this.observeSafe({
          eventType: "request.deferred",
          tenantId: context.tenantId,
          operation: context.routeKey,
          reasonCode: shed.reasonCode,
          severity: "warning",
        });
      }
      return this.result(
        shed?.deferred ? "shed" : "shed",
        shed?.deferred ? "REQUEST_DEFERRED" : "SERVICE_DEGRADED",
        request.correlationId,
        Boolean(shed?.deferred),
        shed?.deferred ? 5 : null,
      );
    }
    const moduleEnabled = await failSafe(() => this.moduleGate.assertEnabled(context));
    if (!moduleEnabled) {
      return this.result("rejected", "MODULE_NOT_ENABLED", request.correlationId, false, null);
    }
    const permissionGranted = await failSafe(() => this.permission.assertGranted(context));
    if (!permissionGranted) {
      return this.result("rejected", "PERMISSION_DENIED", request.correlationId, false, null);
    }
    return this.result("admitted", null, request.correlationId, false, null);
  }

  private result(
    status: AdmissionResult["status"],
    code: AdmissionResult["code"],
    correlationId: string,
    retryable: boolean,
    retryAfterSeconds: number | null,
  ): AdmissionResult {
    return Object.freeze({
      status,
      code,
      supportCode: code ? runtimeSupportCode(correlationId) : null,
      retryable,
      retryAfterSeconds,
      statusCategory: status === "admitted" || status === "duplicate_replay"
        ? "succeeded"
        : status === "shed" && retryable ? "accepted" : "failed",
      actionRequired: false,
    });
  }

  private async observeSafe(event: TrafficObservation): Promise<void> {
    try {
      await this.observations.observe(event);
    } catch {
      // Observability remains a sidecar and cannot change admission.
    }
  }
}

export class StaticModuleGate implements AdmissionModuleGatePort {
  async assertEnabled(context: TrustedAdmissionContext): Promise<boolean> {
    return context.moduleEnabled;
  }
}

export class StaticPermissionGate implements AdmissionPermissionPort {
  async assertGranted(context: TrustedAdmissionContext): Promise<boolean> {
    return context.permissionGranted;
  }
}

async function failSafe<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation();
  } catch {
    return null;
  }
}
