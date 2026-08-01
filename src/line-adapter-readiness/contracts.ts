import {
  LineReadinessError,
  lineSourceTypes,
  lineWebhookEventTypes,
  type LineCapabilityDecision,
  type LineCredentialReferences,
  type LineResponseKind,
  type LineSafeEvidence,
  type LineWebhookEventMetadata,
} from "./models";

const EVENT_KEYS = Object.freeze([
  "eventType",
  "webhookEventId",
  "timestamp",
  "sourceType",
  "isRedelivery",
  "textLength",
  "replyTokenPresent",
] as const);

export const lineTimestampPolicy = Object.freeze({
  staleAfterMs: 5 * 60 * 1000,
  maximumFutureSkewMs: 30 * 1000,
  policyVersion: 1,
});

export const lineReplyTokenPolicy = Object.freeze({
  singleUse: true,
  recommendedUseWithinMs: 60 * 1000,
  redeliveryMaximumEventAgeMs: 20 * 60 * 1000,
  persistence: "forbidden" as const,
  policyVersion: 1,
});

export const lineCapabilityMatrix = Object.freeze<Record<LineResponseKind, LineCapabilityDecision>>({
  text: Object.freeze({ input: "text", plannedOutput: "text", disposition: "supported", reasonCode: "LINE_TEXT_PLANNED", executable: false }),
  confirmation: Object.freeze({ input: "confirmation", plannedOutput: "flex", disposition: "degraded", reasonCode: "LINE_CONFIRMATION_TO_FLEX_PLANNED", executable: false }),
  cards: Object.freeze({ input: "cards", plannedOutput: "flex", disposition: "degraded", reasonCode: "LINE_CARDS_TO_FLEX_PLANNED", executable: false }),
  image: Object.freeze({ input: "image", plannedOutput: "image", disposition: "supported", reasonCode: "LINE_IMAGE_PLANNED", executable: false }),
  video: Object.freeze({ input: "video", plannedOutput: "video", disposition: "supported", reasonCode: "LINE_VIDEO_PLANNED", executable: false }),
  audio: Object.freeze({ input: "audio", plannedOutput: "audio", disposition: "supported", reasonCode: "LINE_AUDIO_PLANNED", executable: false }),
  location: Object.freeze({ input: "location", plannedOutput: "location", disposition: "supported", reasonCode: "LINE_LOCATION_PLANNED", executable: false }),
  sticker: Object.freeze({ input: "sticker", plannedOutput: "sticker", disposition: "supported", reasonCode: "LINE_STICKER_PLANNED", executable: false }),
  unsupported: Object.freeze({ input: "unsupported", plannedOutput: "no_reply", disposition: "rejected", reasonCode: "LINE_CAPABILITY_UNSUPPORTED", executable: false }),
});

export function validateLineWebhookEvent(candidate: unknown): LineWebhookEventMetadata {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new LineReadinessError("LINE_EVENT_INVALID");
  const value = candidate as Record<string, unknown>;
  if (Object.keys(value).some((key) => !(EVENT_KEYS as readonly string[]).includes(key))) throw new LineReadinessError("LINE_EVENT_INVALID");
  if (!(lineWebhookEventTypes as readonly unknown[]).includes(value.eventType)) throw new LineReadinessError("LINE_EVENT_UNSUPPORTED");
  if (typeof value.webhookEventId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(value.webhookEventId)) throw new LineReadinessError("LINE_EVENT_INVALID");
  if (!Number.isSafeInteger(value.timestamp) || (value.timestamp as number) < 0) throw new LineReadinessError("LINE_EVENT_INVALID");
  if (!(lineSourceTypes as readonly unknown[]).includes(value.sourceType)) throw new LineReadinessError("LINE_EVENT_INVALID");
  if (typeof value.isRedelivery !== "boolean" || typeof value.replyTokenPresent !== "boolean") throw new LineReadinessError("LINE_EVENT_INVALID");
  if (!Number.isSafeInteger(value.textLength) || (value.textLength as number) < 0 || (value.textLength as number) > 5000) throw new LineReadinessError("LINE_EVENT_INVALID");
  return Object.freeze({
    contractVersion: 1,
    eventType: value.eventType as LineWebhookEventMetadata["eventType"],
    webhookEventId: value.webhookEventId,
    timestamp: value.timestamp as number,
    sourceType: value.sourceType as LineWebhookEventMetadata["sourceType"],
    isRedelivery: value.isRedelivery,
    textLength: value.textLength as number,
    replyTokenPresent: value.replyTokenPresent,
  });
}

export function assertLineTimestamp(timestamp: number, receivedAt: number): void {
  if (!Number.isSafeInteger(timestamp) || !Number.isSafeInteger(receivedAt)) throw new LineReadinessError("LINE_EVENT_INVALID");
  if (timestamp < receivedAt - lineTimestampPolicy.staleAfterMs) throw new LineReadinessError("LINE_EVENT_STALE");
  if (timestamp > receivedAt + lineTimestampPolicy.maximumFutureSkewMs) throw new LineReadinessError("LINE_EVENT_FROM_FUTURE");
}

export function lineReplayKey(channelAccountKey: string, webhookEventId: string): string {
  if (!/^[A-Za-z0-9_.:-]{1,100}$/.test(channelAccountKey) || !/^[A-Za-z0-9_-]{1,80}$/.test(webhookEventId)) throw new LineReadinessError("LINE_EVENT_INVALID");
  return `line:${channelAccountKey}:${webhookEventId}`;
}

export function evaluateReplyToken(input: Readonly<{ eventTimestamp: number; receivedAt: number; now: number; consumed: boolean; redelivery: boolean }>): "available" {
  if (input.consumed) throw new LineReadinessError("LINE_REPLY_TOKEN_CONSUMED");
  if (input.now < input.receivedAt || input.now - input.receivedAt >= lineReplyTokenPolicy.recommendedUseWithinMs) throw new LineReadinessError("LINE_REPLY_TOKEN_EXPIRED");
  if (input.redelivery && input.receivedAt - input.eventTimestamp >= lineReplyTokenPolicy.redeliveryMaximumEventAgeMs) throw new LineReadinessError("LINE_REPLY_TOKEN_EXPIRED");
  return "available";
}

export function validateLineCredentialReferences(value: LineCredentialReferences): LineCredentialReferences {
  const valid = (reference: string | null): boolean => reference === null || /^[a-z][a-z0-9_.-]{2,79}$/.test(reference);
  if (value.provider !== "line" || value.containsCredentialValue !== false || !valid(value.signatureKeyReference) || !valid(value.deliveryCredentialReference)) throw new LineReadinessError("LINE_CREDENTIAL_REFERENCE_INVALID");
  if (value.state === "not_provisioned" && (value.signatureKeyReference !== null || value.deliveryCredentialReference !== null)) throw new LineReadinessError("LINE_CREDENTIAL_REFERENCE_INVALID");
  return Object.freeze({ ...value });
}

export function lineCapability(kind: LineResponseKind): LineCapabilityDecision {
  return lineCapabilityMatrix[kind];
}

export function buildLineSafeEvidence(input: Readonly<{
  status: LineSafeEvidence["status"];
  reasonCode: string;
  eventType: LineSafeEvidence["eventType"];
  replayKeyDigestPrefix: string | null;
  latencyBucket: LineSafeEvidence["latencyBucket"];
  supportCode: string;
}>): LineSafeEvidence {
  if (!/^[A-Z0-9_]{3,80}$/.test(input.reasonCode) || !/^LN-[A-Z0-9]{8,24}$/.test(input.supportCode)) throw new TypeError("LINE_EVIDENCE_INVALID");
  if (input.replayKeyDigestPrefix !== null && !/^[0-9a-f]{8,16}$/.test(input.replayKeyDigestPrefix)) throw new TypeError("LINE_EVIDENCE_INVALID");
  return Object.freeze({ evidenceVersion: 1, adapterKey: "disabled_line_adapter", lifecycle: "readiness_candidate", ...input, networkUsed: false });
}
