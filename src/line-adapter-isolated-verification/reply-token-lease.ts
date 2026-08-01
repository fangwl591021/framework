import { LineIsolatedVerificationError } from "./models";

const ONE_MINUTE_MS = 60_000;
const REDELIVERY_EVENT_MAX_AGE_MS = 20 * 60_000;

type LeaseState = {
  readonly tokenDigest: string;
  readonly receivedAt: number;
  readonly eventTimestamp: number;
  consumed: boolean;
};

export type ReplyTokenLeaseDecision = Readonly<{
  status: "available" | "consumed" | "no_reply" | "expired" | "used" | "redelivery_unverified";
  eventKey: string;
  expiresAt: number | null;
  tokenPersisted: false;
  networkUsed: false;
}>;

async function tokenDigest(token: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decision(status: ReplyTokenLeaseDecision["status"], eventKey: string, expiresAt: number | null): ReplyTokenLeaseDecision {
  return Object.freeze({ status, eventKey, expiresAt, tokenPersisted: false, networkUsed: false });
}

export class InMemoryReplyTokenLease {
  private readonly leases = new Map<string, LeaseState>();

  async acquire(input: Readonly<{
    eventKey: string;
    replyToken: string | null;
    eventTimestamp: number;
    receivedAt: number;
    now: number;
    isRedelivery: boolean;
  }>): Promise<ReplyTokenLeaseDecision> {
    if (!/^[A-Za-z0-9_.:-]{1,180}$/.test(input.eventKey) || !Number.isSafeInteger(input.eventTimestamp) || !Number.isSafeInteger(input.receivedAt) || !Number.isSafeInteger(input.now)) {
      throw new LineIsolatedVerificationError("LINE_ISOLATED_REPLY_TOKEN_INVALID");
    }
    if (input.replyToken === null) return decision("no_reply", input.eventKey, null);
    if (input.replyToken.length === 0 || input.replyToken.length > 255) throw new LineIsolatedVerificationError("LINE_ISOLATED_REPLY_TOKEN_INVALID");
    const expiresAt = input.receivedAt + ONE_MINUTE_MS;
    if (input.now < input.receivedAt || input.now >= expiresAt || input.now - input.eventTimestamp >= REDELIVERY_EVENT_MAX_AGE_MS) return decision("expired", input.eventKey, expiresAt);
    const digest = await tokenDigest(input.replyToken);
    const existing = this.leases.get(input.eventKey);
    if (existing) {
      if (existing.tokenDigest !== digest) throw new LineIsolatedVerificationError("LINE_ISOLATED_REPLY_TOKEN_INVALID");
      if (existing.consumed) return decision("used", input.eventKey, existing.receivedAt + ONE_MINUTE_MS);
      return decision("available", input.eventKey, existing.receivedAt + ONE_MINUTE_MS);
    }
    if (input.isRedelivery) return decision("redelivery_unverified", input.eventKey, expiresAt);
    this.leases.set(input.eventKey, { tokenDigest: digest, receivedAt: input.receivedAt, eventTimestamp: input.eventTimestamp, consumed: false });
    return decision("available", input.eventKey, expiresAt);
  }

  async consume(eventKey: string, replyToken: string, now: number): Promise<ReplyTokenLeaseDecision> {
    const existing = this.leases.get(eventKey);
    if (!existing || existing.tokenDigest !== await tokenDigest(replyToken)) throw new LineIsolatedVerificationError("LINE_ISOLATED_REPLY_TOKEN_INVALID");
    const expiresAt = existing.receivedAt + ONE_MINUTE_MS;
    if (now < existing.receivedAt || now >= expiresAt) return decision("expired", eventKey, expiresAt);
    if (existing.consumed) return decision("used", eventKey, expiresAt);
    existing.consumed = true;
    return decision("consumed", eventKey, expiresAt);
  }

  evidence(): readonly Readonly<{ eventKey: string; state: "available" | "used"; tokenPersisted: false }>[] {
    return Object.freeze([...this.leases.entries()].map(([eventKey, lease]) => Object.freeze({ eventKey, state: lease.consumed ? "used" as const : "available" as const, tokenPersisted: false as const })));
  }
}

export const isolatedReplyTokenPolicy = Object.freeze({
  transientOnly: true,
  singleUse: true,
  receivedWindowMs: ONE_MINUTE_MS,
  redeliveryEventMaximumAgeMs: REDELIVERY_EVENT_MAX_AGE_MS,
  persistence: "forbidden",
  redeliveryRequiresTrackedUsability: true,
} as const);
