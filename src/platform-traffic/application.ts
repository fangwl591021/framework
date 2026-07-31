import {
  CoreApplicationBase,
  assertSafeText,
  type MutationContext,
} from "../application/core-application-base";
import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import { sha256Hex, type IdentityDigestKeyProvider } from "../persistence/crypto";
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
const WEBHOOK_LEASE_MS = 30_000;
const WEBHOOK_MAX_ATTEMPTS = 3;
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
    if (existing && existing.status !== "expired") {
      if (existing.payloadFingerprint !== fingerprint.payloadFingerprint
        || existing.normalizedEventType !== fingerprint.normalizedEventType) {
        throw new TrafficProtectionError("EVENT_FINGERPRINT_CONFLICT", false);
      }
      await this.incrementReplay(existing.receiptId, fingerprint.tenantId, now);
      if (existing.status === "completed") return replay(existing, "duplicate_replay");
      if (existing.status === "failed_terminal") return replay(existing, "terminal_failure");
      if (existing.status === "processing" && (existing.leaseExpiresAt ?? 0) > now) {
        return replay(existing, "processing_deferred", Math.max(1, Math.ceil(((existing.leaseExpiresAt as number) - now) / 1000)));
      }
      if (existing.attemptCount >= WEBHOOK_MAX_ATTEMPTS) {
        await this.markTerminal(existing, now);
        return replay({ ...existing, status: "failed_terminal", safeFailureCode: "WEBHOOK_MAX_ATTEMPTS" }, "terminal_failure");
      }
      const leaseToken = this.uuidv7.generate();
      const [taken] = await this.db.batch([
        this.db.prepare(
          `UPDATE webhook_receipts SET status='processing', lease_owner_token=?1,
           lease_expires_at=?2, attempt_count=attempt_count+1, last_attempt_at=?3,
           safe_failure_code=NULL, updated_at=?3
           WHERE tenant_id=?4 AND id=?5 AND attempt_count=?6
             AND status IN ('processing','failed_retryable') AND lease_expires_at<=?3`,
        ).bind(leaseToken, now + WEBHOOK_LEASE_MS, now, fingerprint.tenantId, existing.receiptId, existing.attemptCount),
        this.webhookAudit("traffic.webhook.takeover", "WEBHOOK_LEASE_TAKEOVER", fingerprint.tenantId, existing.receiptId, leaseToken, "processing", context, now),
      ]);
      if (taken?.meta.changes === 1) return Object.freeze({ status: "lease_takeover", receiptId: existing.receiptId, safeResult: null, executeMutation: true, leaseToken, attemptCount: existing.attemptCount + 1, retryAfterSeconds: null });
      const winner = await this.traffic.getWebhookReceipt(fingerprint.tenantId, existing.receiptId);
      if (!winner) throw new TenantBoundaryError();
      return winner.status === "completed" ? replay(winner, "duplicate_replay") : replay(winner, "processing_deferred", 1);
    }
    const receiptId = this.uuidv7.generate();
    const leaseToken = this.uuidv7.generate();
    try {
      await this.db.batch([
        this.db.prepare(
          `INSERT INTO webhook_receipts (
            id, tenant_id, application_scope_key, provider_key, provider_event_id,
            issuer_context_digest, normalized_event_type, payload_fingerprint,
            status, safe_result_json, lease_owner_token, lease_expires_at,
            attempt_count, last_attempt_at, safe_failure_code, completed_at,
            replay_count, first_received_at, last_received_at, expires_at, created_at, updated_at
          ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'processing',NULL,?9,?10,1,?11,NULL,NULL,0,?11,?11,?12,?11,?11)`,
        ).bind(receiptId, fingerprint.tenantId, fingerprint.applicationScopeKey,
          fingerprint.providerKey, fingerprint.providerEventId, fingerprint.issuerContextDigest,
          fingerprint.normalizedEventType, fingerprint.payloadFingerprint, leaseToken,
          now + WEBHOOK_LEASE_MS, now, now + WEBHOOK_TTL_MS),
        this.webhookAudit("traffic.webhook.claim", "WEBHOOK_FIRST_SEEN", fingerprint.tenantId, receiptId, leaseToken, "processing", context, now),
      ]);
      return Object.freeze({ status: "first_seen", receiptId, safeResult: null, executeMutation: true, leaseToken, attemptCount: 1, retryAfterSeconds: null });
    } catch (error) {
      const winner = await this.traffic.findWebhookReceipt(fingerprint);
      if (!winner) throw error;
      if (winner.payloadFingerprint !== fingerprint.payloadFingerprint) throw new TrafficProtectionError("EVENT_FINGERPRINT_CONFLICT", false);
      return winner.status === "completed" ? replay(winner, "duplicate_replay") : replay(winner, "processing_deferred", 1);
    }
  }

  async completeWebhook(
    tenantId: string,
    receiptId: string,
    leaseToken: string,
    safeResult: Readonly<Record<string, string | number | boolean | null>>,
    _context: MutationContext,
  ): Promise<Readonly<{ receiptId: string; status: "completed" }>> {
    assertSafeText("tenantId", tenantId, 36); assertSafeText("receiptId", receiptId, 36); assertSafeText("leaseToken", leaseToken, 36);
    const storedResult = JSON.stringify(safeResult);
    if (storedResult.length > 2048 || /token|authorization|request.?body|raw.?uid|secret|stack|select\s/i.test(storedResult)) throw new TypeError("UNSAFE_WEBHOOK_RESULT");
    const now = this.clock.now().getTime();
    const [result] = await this.db.batch([
      this.db.prepare(
        `UPDATE webhook_receipts SET status='completed', safe_result_json=?1,
         lease_expires_at=NULL, completed_at=?2, updated_at=?2
         WHERE tenant_id=?3 AND id=?4 AND status='processing'
           AND lease_owner_token=?5 AND lease_expires_at>?2`,
      ).bind(storedResult, now, tenantId, receiptId, leaseToken),
      this.webhookAudit("traffic.webhook.complete", "WEBHOOK_MUTATION_COMPLETED", tenantId, receiptId, leaseToken, "completed", _context, now),
    ]);
    if (result?.meta.changes !== 1) {
      const existing = await this.traffic.getWebhookReceipt(tenantId, receiptId);
      if (existing?.status === "completed" && existing.leaseOwnerToken === leaseToken) return Object.freeze({ receiptId, status: "completed" });
      throw new TrafficProtectionError("STALE_WEBHOOK_LEASE", false);
    }
    return Object.freeze({ receiptId, status: "completed" });
  }

  async failWebhook(tenantId: string, receiptId: string, leaseToken: string, safeFailureCode: string, context: MutationContext): Promise<"failed_retryable" | "failed_terminal"> {
    assertSafeText("safeFailureCode", safeFailureCode, 80);
    if (/token|secret|stack|sql|payload/i.test(safeFailureCode)) throw new TypeError("UNSAFE_WEBHOOK_FAILURE");
    const now = this.clock.now().getTime();
    const current = await this.traffic.getWebhookReceipt(tenantId, receiptId);
    if (!current) throw new TenantBoundaryError();
    const status = current.attemptCount >= WEBHOOK_MAX_ATTEMPTS ? "failed_terminal" : "failed_retryable";
    const retryAt = status === "failed_retryable" ? now + WEBHOOK_LEASE_MS : null;
    const [result] = await this.db.batch([
      this.db.prepare(
        `UPDATE webhook_receipts SET status=?1, safe_failure_code=?2,
         lease_expires_at=?3, updated_at=?4 WHERE tenant_id=?5 AND id=?6
         AND status='processing' AND lease_owner_token=?7`,
      ).bind(status, safeFailureCode, retryAt, now, tenantId, receiptId, leaseToken),
      this.webhookAudit("traffic.webhook.fail", safeFailureCode, tenantId, receiptId, leaseToken, status, context, now),
    ]);
    if (result?.meta.changes !== 1) throw new TrafficProtectionError("STALE_WEBHOOK_LEASE", false);
    return status;
  }

  async recoverWebhookCompletion(tenantId: string, receiptId: string, leaseToken: string, operation: string, businessIdempotencyKey: string, context: MutationContext) {
    const keyHash = await sha256Hex(businessIdempotencyKey);
    const record = await this.repositories.idempotency.findTenant(tenantId, operation, keyHash);
    if (!record || record.status !== "completed" || !record.storedResultJson) return null;
    const stored = JSON.parse(record.storedResultJson) as Readonly<Record<string, string | number | boolean | null>>;
    await this.completeWebhook(tenantId, receiptId, leaseToken, stored, context);
    return stored;
  }

  private webhookAudit(action: string, reasonCode: string, tenantId: string, receiptId: string, leaseToken: string, status: string, context: MutationContext, timestamp: number): D1PreparedStatement {
    return this.db.prepare(`INSERT INTO audit_records (id,scope_type,tenant_id,actor_type,actor_reference,action,resource_type,resource_reference,decision,reason_code,correlation_reference,occurred_at,created_at)
      SELECT ?1,'tenant',?2,?3,?4,?5,'webhook_receipt',?6,'changed',?7,?8,?9,?9
      FROM webhook_receipts WHERE tenant_id=?2 AND id=?6 AND lease_owner_token=?10 AND status=?11`)
      .bind(this.uuidv7.generate(),tenantId,context.actorType,context.actorReference,action,receiptId,reasonCode,context.correlationId,timestamp,leaseToken,status);
  }

  private async incrementReplay(receiptId: string, tenantId: string, now: number) {
    await this.db.prepare(`UPDATE webhook_receipts SET replay_count=CASE WHEN replay_count<1000000000 THEN replay_count+1 ELSE replay_count END,last_received_at=?1,updated_at=?1 WHERE tenant_id=?2 AND id=?3`).bind(now,tenantId,receiptId).run();
  }

  private async markTerminal(existing: import("./models").WebhookReceiptRecord, now: number) {
    await this.db.prepare(`UPDATE webhook_receipts SET status='failed_terminal',safe_failure_code='WEBHOOK_MAX_ATTEMPTS',lease_expires_at=NULL,updated_at=?1 WHERE tenant_id=?2 AND id=?3 AND status IN ('processing','failed_retryable')`).bind(now,existing.tenantId,existing.receiptId).run();
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

function replay(record: import("./models").WebhookReceiptRecord, status: WebhookReplayResult["status"], retryAfterSeconds: number | null = null): WebhookReplayResult {
  return Object.freeze({ status, receiptId: record.receiptId, safeResult: record.safeResult, executeMutation: false, leaseToken: null, attemptCount: record.attemptCount, retryAfterSeconds });
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
