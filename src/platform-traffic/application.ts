import {
  CoreApplicationBase,
  assertSafeText,
  type MutationContext,
} from "../application/core-application-base";
import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import type { IdentityDigestKeyProvider } from "../persistence/crypto";
import { TenantBoundaryError } from "../persistence/models";
import { TrafficProtectionError } from "./errors";
import type {
  RateLimitDecision,
  TrustedAdmissionContext,
  WebhookEventFingerprint,
  WebhookReplayResult,
} from "./models";
import { D1TrafficProtectionRepository, type TrafficEvidencePage } from "./repository";

const WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000;
const EVIDENCE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const trafficPermissions = Object.freeze({
  readTenant: "traffic:read_tenant",
  readPlatform: "traffic:read_platform",
  managePolicy: "traffic:manage_policy",
  circuitRead: "circuit:read",
  circuitManage: "circuit:manage",
  degradationRead: "degradation:read",
  degradationManage: "degradation:manage",
});

export interface TrafficAccessContext {
  readonly tenantId: string | null;
  readonly permissionKeys: readonly string[];
}

export class PlatformTrafficProtectionApplication extends CoreApplicationBase {
  readonly traffic: D1TrafficProtectionRepository;

  constructor(
    db: D1Database,
    clock: Clock,
    uuidv7: UuidV7,
    identityKeys: IdentityDigestKeyProvider,
  ) {
    super(db, clock, uuidv7, identityKeys);
    this.traffic = new D1TrafficProtectionRepository(db);
  }

  async claimWebhook(
    fingerprint: WebhookEventFingerprint,
    context: MutationContext,
  ): Promise<WebhookReplayResult> {
    validateFingerprint(fingerprint);
    const now = this.clock.now().getTime();
    const existing = await this.traffic.findWebhookReceipt(fingerprint);
    if (existing && existing.expiresAt > now) {
      if (
        existing.payloadFingerprint !== fingerprint.payloadFingerprint
        || existing.normalizedEventType !== fingerprint.normalizedEventType
      ) {
        throw new TrafficProtectionError("EVENT_FINGERPRINT_CONFLICT", false);
      }
      await this.db.prepare(
        `UPDATE webhook_receipts
         SET replay_count = CASE
           WHEN replay_count < 1000000000 THEN replay_count + 1
           ELSE replay_count END,
           last_received_at = ?1, updated_at = ?1
         WHERE tenant_id = ?2 AND id = ?3`,
      ).bind(now, fingerprint.tenantId, existing.receiptId).run();
      return Object.freeze({
        status: "duplicate_replay",
        receiptId: existing.receiptId,
        safeResult: existing.safeResult,
        executeMutation: false,
      });
    }
    const receiptId = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId: fingerprint.tenantId },
      "traffic.webhook.claim",
      fingerprint,
      context,
      (timestamp) => ({
        result: Object.freeze({
          status: "first_seen" as const,
          receiptId,
          safeResult: null,
          executeMutation: true,
        }),
        statements: [
          ...(existing ? [this.db.prepare(
            `UPDATE webhook_receipts
             SET status = 'expired', updated_at = ?1
             WHERE tenant_id = ?2 AND id = ?3 AND status <> 'expired'
               AND expires_at <= ?1`,
          ).bind(timestamp, fingerprint.tenantId, existing.receiptId)] : []),

          this.db.prepare(
            `INSERT INTO webhook_receipts (
              id, tenant_id, application_scope_key, provider_key,
              provider_event_id, issuer_context_digest, normalized_event_type,
              payload_fingerprint, status, safe_result_json, replay_count,
              first_received_at, last_received_at, expires_at, created_at, updated_at
            ) VALUES (
              ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'processing', NULL, 0,
              ?9, ?9, ?10, ?9, ?9
            )`,
          ).bind(
            receiptId,
            fingerprint.tenantId,
            fingerprint.applicationScopeKey,
            fingerprint.providerKey,
            fingerprint.providerEventId,
            fingerprint.issuerContextDigest,
            fingerprint.normalizedEventType,
            fingerprint.payloadFingerprint,
            timestamp,
            timestamp + WEBHOOK_TTL_MS,
          ),
        ],
        audit: {
          action: "traffic.webhook.claim",
          resourceType: "webhook_receipt",
          resourceReference: receiptId,
          reasonCode: "WEBHOOK_FIRST_SEEN",
        },
      }),
    );
  }

  async completeWebhook(
    tenantId: string,
    receiptId: string,
    safeResult: Readonly<Record<string, string | number | boolean | null>>,
    context: MutationContext,
  ): Promise<Readonly<{ receiptId: string; status: "completed" }>> {
    assertSafeText("tenantId", tenantId, 36);
    assertSafeText("receiptId", receiptId, 36);
    const storedResult = JSON.stringify(safeResult);
    if (
      storedResult.length > 2048
      || /token|authorization|request.?body|raw.?uid|secret|stack|select\s/i.test(storedResult)
    ) {
      throw new TypeError("UNSAFE_WEBHOOK_RESULT");
    }
    const existing = await this.traffic.getWebhookReceipt(tenantId, receiptId);
    if (!existing) throw new TenantBoundaryError();
    if (existing.status === "completed") {
      return Object.freeze({ receiptId, status: "completed" });
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "traffic.webhook.complete",
      { receiptId, safeResult },
      context,
      (timestamp) => ({
        result: Object.freeze({ receiptId, status: "completed" as const }),
        statements: [

          this.db.prepare(
            `UPDATE webhook_receipts
             SET status = 'completed', safe_result_json = ?1, updated_at = ?2
             WHERE tenant_id = ?3 AND id = ?4 AND status = 'processing'`,
          ).bind(storedResult, timestamp, tenantId, receiptId),
        ],
        audit: {
          action: "traffic.webhook.complete",
          resourceType: "webhook_receipt",
          resourceReference: receiptId,
          reasonCode: "WEBHOOK_MUTATION_COMPLETED",
        },
      }),
    );
  }

  async recordRateLimitEvidence(
    context: TrustedAdmissionContext,
    decision: RateLimitDecision,
    mutation: MutationContext,
  ): Promise<Readonly<{ evidenceId: string }>> {
    validateTrustedContext(context);
    const evidenceId = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId: context.tenantId },
      "traffic.rate_limit.evidence",
      { context, decision },
      mutation,
      (timestamp) => ({
        result: Object.freeze({ evidenceId }),
        statements: [

          this.db.prepare(
            `INSERT INTO rate_limit_evidence (
              id, scope_type, tenant_id, environment, application_scope_key,
              module_key, route_key, dimension_key_digest, decision, reason_code,
              priority_class, window_started_at, occurred_at, occurrence_count,
              expires_at, created_at
            ) VALUES (
              ?1, 'tenant', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
              ?11, ?11, 1, ?12, ?11
            )`,
          ).bind(
            evidenceId,
            context.tenantId,
            context.environment,
            context.applicationId ?? "tenant",
            context.moduleKey,
            context.routeKey,
            context.actorDigest ?? context.ipDigest,
            decision.admitted ? "admitted" : "throttled",
            decision.reasonCode,
            context.priority,
            timestamp,
            timestamp + EVIDENCE_TTL_MS,
          ),
        ],
        audit: {
          action: "traffic.rate_limit.evidence",
          resourceType: "rate_limit_evidence",
          resourceReference: evidenceId,
          reasonCode: decision.reasonCode,
        },
      }),
    );
  }

  async listEvidence(
    requestedTenantId: string | null,
    access: TrafficAccessContext,
    limit = 50,
    cursor: string | null = null,
  ): Promise<TrafficEvidencePage> {
    const platform = access.permissionKeys.includes(trafficPermissions.readPlatform);
    if (!platform) {
      if (
        !requestedTenantId
        || requestedTenantId !== access.tenantId
        || !access.permissionKeys.includes(trafficPermissions.readTenant)
      ) {
        throw new TenantBoundaryError();
      }
    }
    return this.traffic.listRateLimitEvidence(
      requestedTenantId,
      platform,
      limit,
      cursor,
    );
  }

  async listRetentionEligible(
    tenantId: string,
    limit = 50,
  ) {
    return this.traffic.listExpiredWebhookReceipts(
      tenantId,
      this.clock.now().getTime(),
      limit,
    );
  }
}

function validateFingerprint(fingerprint: WebhookEventFingerprint): void {
  const text = [
    fingerprint.tenantId,
    fingerprint.applicationScopeKey,
    fingerprint.providerKey,
    fingerprint.providerEventId,
    fingerprint.normalizedEventType,
  ];
  if (text.some((value) => !value.trim() || value.length > 200)) {
    throw new TypeError("INVALID_WEBHOOK_FINGERPRINT");
  }
  if (
    !/^digest:[0-9a-f]{64}$/.test(fingerprint.issuerContextDigest)
    || !/^[0-9a-f]{64}$/.test(fingerprint.payloadFingerprint)
  ) {
    throw new TypeError("INVALID_WEBHOOK_FINGERPRINT");
  }
}

function validateTrustedContext(context: TrustedAdmissionContext): void {
  if (context.source !== "trusted_runtime_context") {
    throw new TypeError("UNTRUSTED_ADMISSION_CONTEXT");
  }
  if (
    context.actorDigest && !/^digest:[0-9a-f]{64}$/.test(context.actorDigest)
    || context.ipDigest && !/^digest:[0-9a-f]{64}$/.test(context.ipDigest)
  ) {
    throw new TypeError("UNTRUSTED_CLIENT_EVIDENCE");
  }
}
