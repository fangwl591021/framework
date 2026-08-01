import { buildIsolatedLineEvidence } from "./evidence";
import { LineIsolatedVerificationError, type IsolatedLineWebhookDecision, type LineReplayDisposition } from "./models";
import { normalizeVerifiedLineWebhook } from "./normalizer";

function decodeBase64(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return null;
  try {
    const decoded = atob(value);
    if (decoded.length !== 32) return null;
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function verifyIsolatedLineSignature(
  rawBody: Uint8Array,
  xLineSignature: string | null,
  fixtureKey: Uint8Array,
): Promise<void> {
  if (!xLineSignature) throw new LineIsolatedVerificationError("LINE_ISOLATED_SIGNATURE_MISSING");
  const signature = decodeBase64(xLineSignature);
  if (!signature || rawBody.byteLength === 0 || rawBody.byteLength > 16 * 1024 || fixtureKey.byteLength < 16 || fixtureKey.byteLength > 128) {
    throw new LineIsolatedVerificationError("LINE_ISOLATED_SIGNATURE_INVALID");
  }
  const key = await crypto.subtle.importKey("raw", fixtureKey, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  // Web Crypto performs the MAC verification without a caller-visible early-exit comparison.
  if (!(await crypto.subtle.verify("HMAC", key, signature, rawBody))) throw new LineIsolatedVerificationError("LINE_ISOLATED_SIGNATURE_INVALID");
}

export const isolatedLineSignatureVerificationContract = Object.freeze({
  headerName: "x-line-signature",
  algorithm: "HMAC-SHA256",
  input: "exact_original_request_body_bytes",
  order: "before_parse_deserialize_normalize",
  comparisonPath: "web_crypto_subtle_verify",
  missingBehavior: "fail_closed",
  mismatchBehavior: "fail_closed",
} as const);

export class LineIsolatedVerificationHarness {
  private readonly replay = new Map<string, string>();

  constructor(private readonly fixtureKey: Uint8Array) {}

  async verify(input: Readonly<{
    channelAccountKey: string;
    rawBody: Uint8Array;
    xLineSignature: string | null;
  }>): Promise<IsolatedLineWebhookDecision> {
    if (!/^[A-Za-z0-9_.:-]{1,100}$/.test(input.channelAccountKey)) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
    await verifyIsolatedLineSignature(input.rawBody, input.xLineSignature, this.fixtureKey);
    const webhook = await normalizeVerifiedLineWebhook(input.rawBody);
    if (webhook.events.length === 0) {
      return Object.freeze({
        httpStatusDecision: 200,
        status: "verification_accepted",
        destinationTrustedAsTenantAuthority: false,
        events: Object.freeze([]),
        workbenchInvoked: false,
        networkUsed: false,
      });
    }
    const decisions = webhook.events.map((event) => {
      const replayKey = `${input.channelAccountKey}:${event.webhookEventId}`;
      const existing = this.replay.get(replayKey);
      let disposition: LineReplayDisposition;
      if (existing === undefined) {
        this.replay.set(replayKey, event.payloadDigest);
        disposition = "accepted";
      } else {
        disposition = existing === event.payloadDigest ? "replay" : "conflict";
      }
      return Object.freeze({ webhookEventId: event.webhookEventId, disposition, evidence: buildIsolatedLineEvidence(event, disposition) });
    });
    return Object.freeze({
      httpStatusDecision: 200,
      status: "events_evaluated",
      destinationTrustedAsTenantAuthority: false,
      events: Object.freeze(decisions),
      workbenchInvoked: false,
      networkUsed: false,
    });
  }
}
