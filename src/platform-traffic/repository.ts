import type {
  WebhookEventFingerprint,
  WebhookReceiptRecord,
} from "./models";

type WebhookRow = {
  id: string;
  tenant_id: string;
  application_scope_key: string;
  provider_key: string;
  provider_event_id: string;
  issuer_context_digest: string;
  normalized_event_type: string;
  payload_fingerprint: string;
  status: WebhookReceiptRecord["status"];
  safe_result_json: string | null;
  replay_count: number;
  first_received_at: number;
  last_received_at: number;
  expires_at: number;
};

export interface TrafficEvidencePage {
  readonly items: readonly Readonly<{
    id: string;
    tenantId: string | null;
    decision: string;
    reasonCode: string;
    occurredAt: number;
  }>[];
  readonly nextCursor: string | null;
}

export class D1TrafficProtectionRepository {
  constructor(private readonly db: D1Database) {}

  async findWebhookReceipt(
    fingerprint: Omit<WebhookEventFingerprint, "payloadFingerprint" | "normalizedEventType">,
  ): Promise<WebhookReceiptRecord | null> {
    const row = await this.db.prepare(
      `${WEBHOOK_SELECT}
       WHERE tenant_id = ?1 AND application_scope_key = ?2
         AND provider_key = ?3 AND issuer_context_digest = ?4
         AND provider_event_id = ?5
       ORDER BY CASE WHEN status = 'expired' THEN 1 ELSE 0 END, created_at DESC LIMIT 1`,
    ).bind(
      fingerprint.tenantId,
      fingerprint.applicationScopeKey,
      fingerprint.providerKey,
      fingerprint.issuerContextDigest,
      fingerprint.providerEventId,
    ).first<WebhookRow>();
    return row ? webhook(row) : null;
  }

  async getWebhookReceipt(
    tenantId: string,
    receiptId: string,
  ): Promise<WebhookReceiptRecord | null> {
    const row = await this.db.prepare(
      `${WEBHOOK_SELECT} WHERE tenant_id = ?1 AND id = ?2 LIMIT 1`,
    ).bind(tenantId, receiptId).first<WebhookRow>();
    return row ? webhook(row) : null;
  }

  async listExpiredWebhookReceipts(
    tenantId: string,
    now: number,
    limit: number,
  ): Promise<readonly WebhookReceiptRecord[]> {
    const result = await this.db.prepare(
      `${WEBHOOK_SELECT}
       WHERE tenant_id = ?1 AND expires_at <= ?2
       ORDER BY expires_at, id LIMIT ?3`,
    ).bind(tenantId, now, boundedLimit(limit)).all<WebhookRow>();
    return Object.freeze(result.results.map(webhook));
  }

  async listRateLimitEvidence(
    tenantId: string | null,
    platformAccess: boolean,
    limit = 50,
    cursor: string | null = null,
  ): Promise<TrafficEvidencePage> {
    const bounded = boundedLimit(limit);
    const result = await this.db.prepare(
      `SELECT id, tenant_id, decision, reason_code, occurred_at
       FROM rate_limit_evidence
       WHERE (?1 = 1 OR tenant_id = ?2) AND (?3 IS NULL OR id < ?3)
       ORDER BY id DESC LIMIT ?4`,
    ).bind(platformAccess ? 1 : 0, tenantId, cursor, bounded + 1).all<{
      id: string;
      tenant_id: string | null;
      decision: string;
      reason_code: string;
      occurred_at: number;
    }>();
    const items = result.results.slice(0, bounded).map((row) => Object.freeze({
      id: row.id,
      tenantId: row.tenant_id,
      decision: row.decision,
      reasonCode: row.reason_code,
      occurredAt: row.occurred_at,
    }));
    return Object.freeze({
      items: Object.freeze(items),
      nextCursor: result.results.length > bounded
        ? items[items.length - 1]?.id ?? null
        : null,
    });
  }
}

const WEBHOOK_SELECT = `SELECT id, tenant_id, application_scope_key,
  provider_key, provider_event_id, issuer_context_digest,
  normalized_event_type, payload_fingerprint, status, safe_result_json,
  replay_count, first_received_at, last_received_at, expires_at
  FROM webhook_receipts`;

function webhook(row: WebhookRow): WebhookReceiptRecord {
  return Object.freeze({
    receiptId: row.id,
    tenantId: row.tenant_id,
    applicationScopeKey: row.application_scope_key,
    providerKey: row.provider_key,
    providerEventId: row.provider_event_id,
    issuerContextDigest: row.issuer_context_digest,
    normalizedEventType: row.normalized_event_type,
    payloadFingerprint: row.payload_fingerprint,
    status: row.status,
    safeResult: row.safe_result_json
      ? JSON.parse(row.safe_result_json) as Record<string, string | number | boolean | null>
      : null,
    replayCount: row.replay_count,
    firstReceivedAt: row.first_received_at,
    lastReceivedAt: row.last_received_at,
    expiresAt: row.expires_at,
  });
}

function boundedLimit(limit: number): number {
  if (!Number.isInteger(limit)) throw new TypeError("INVALID_PAGE_LIMIT");
  return Math.max(1, Math.min(limit, 100));
}
