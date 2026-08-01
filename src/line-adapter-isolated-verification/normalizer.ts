import {
  LineIsolatedVerificationError,
  type IsolatedChannelEventType,
  type IsolatedLineEventType,
  type IsolatedLineSourceType,
  type NormalizedIsolatedLineEvent,
  type NormalizedIsolatedLineWebhook,
} from "./models";

const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
const MAX_RAW_BYTES = 16 * 1024;
const MAX_EVENTS = 50;
const MAX_IDENTIFIER = 255;
const MAX_TEXT = 5000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.length > 0 && [...value].length <= maximum ? value : null;
}

function source(event: Record<string, unknown>): Readonly<{
  sourceType: IsolatedLineSourceType;
  sourceLookupReference: string | null;
}> {
  if (!isRecord(event.source)) return Object.freeze({ sourceType: "none", sourceLookupReference: null });
  const sourceType = event.source.type;
  if (sourceType !== "user" && sourceType !== "group" && sourceType !== "room") {
    return Object.freeze({ sourceType: "none", sourceLookupReference: null });
  }
  const lookup = sourceType === "user"
    ? boundedString(event.source.userId, MAX_IDENTIFIER)
    : boundedString(event.source.userId, MAX_IDENTIFIER)
      ?? boundedString(event.source[sourceType === "group" ? "groupId" : "roomId"], MAX_IDENTIFIER);
  return Object.freeze({ sourceType, sourceLookupReference: lookup });
}

function eventMapping(event: Record<string, unknown>): Readonly<{
  providerEventType: IsolatedLineEventType;
  channelEventType: IsolatedChannelEventType;
  contentClass: NormalizedIsolatedLineEvent["contentClass"];
  contentLength: number;
}> {
  if (event.type === "message" && isRecord(event.message)) {
    if (event.message.type === "text") {
      const text = boundedString(event.message.text, MAX_TEXT);
      if (text === null) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
      return Object.freeze({ providerEventType: "message.text", channelEventType: "text_message", contentClass: "text", contentLength: [...text].length });
    }
    if (event.message.type === "file") {
      const fileName = boundedString(event.message.fileName, MAX_IDENTIFIER);
      if (fileName === null || !Number.isSafeInteger(event.message.fileSize) || (event.message.fileSize as number) < 0) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
      return Object.freeze({ providerEventType: "message.file", channelEventType: "unsupported", contentClass: "file", contentLength: [...fileName].length });
    }
    if (event.message.type === "location") {
      if (typeof event.message.latitude !== "number" || typeof event.message.longitude !== "number") throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
      const title = typeof event.message.title === "string" ? event.message.title : "";
      const address = typeof event.message.address === "string" ? event.message.address : "";
      if ([...title].length > MAX_IDENTIFIER || [...address].length > MAX_TEXT) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
      return Object.freeze({ providerEventType: "message.location", channelEventType: "unsupported", contentClass: "location", contentLength: [...title, ...address].length });
    }
  }
  if (event.type === "follow") return Object.freeze({ providerEventType: "follow", channelEventType: "follow", contentClass: "none", contentLength: 0 });
  if (event.type === "unfollow") return Object.freeze({ providerEventType: "unfollow", channelEventType: "unfollow", contentClass: "none", contentLength: 0 });
  if (event.type === "postback" && isRecord(event.postback)) {
    const data = boundedString(event.postback.data, MAX_TEXT);
    if (data === null) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
    return Object.freeze({ providerEventType: "postback", channelEventType: "postback", contentClass: "postback", contentLength: [...data].length });
  }
  throw new LineIsolatedVerificationError("LINE_ISOLATED_EVENT_UNSUPPORTED");
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().filter((key) => key !== "replyToken" && key !== "deliveryContext").map((key) => [key, stableValue(value[key])]));
}

async function digestEvent(event: Record<string, unknown>): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(stableValue(event)));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function normalizeEvent(value: unknown): Promise<NormalizedIsolatedLineEvent> {
  if (!isRecord(value)) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
  const webhookEventId = boundedString(value.webhookEventId, 80);
  if (!webhookEventId || !/^[0-9A-Za-z_-]+$/.test(webhookEventId)) throw new LineIsolatedVerificationError("LINE_ISOLATED_EVENT_ID_REQUIRED");
  if (!Number.isSafeInteger(value.timestamp) || (value.timestamp as number) < 0) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
  const mapping = eventMapping(value);
  const providerSource = source(value);
  const isRedelivery = isRecord(value.deliveryContext) && value.deliveryContext.isRedelivery === true;
  const replyToken = value.replyToken === undefined ? null : boundedString(value.replyToken, MAX_IDENTIFIER);
  if (value.replyToken !== undefined && replyToken === null) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
  return Object.freeze({
    contractVersion: 1,
    webhookEventId,
    ...mapping,
    timestamp: value.timestamp as number,
    sourceType: providerSource.sourceType,
    sourceLookupOnly: true,
    isRedelivery,
    redeliveryIsEvidenceOnly: true,
    payloadDigest: await digestEvent(value),
    transient: Object.freeze({ persistence: "forbidden", sourceLookupReference: providerSource.sourceLookupReference, replyToken }),
  });
}

export async function normalizeVerifiedLineWebhook(rawBody: Uint8Array): Promise<NormalizedIsolatedLineWebhook> {
  if (rawBody.byteLength === 0 || rawBody.byteLength > MAX_RAW_BYTES) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_TOO_LARGE");
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(rawBody));
  } catch {
    throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.events) || parsed.events.length > MAX_EVENTS) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
  const destination = parsed.destination === undefined ? null : boundedString(parsed.destination, 64);
  if (parsed.destination !== undefined && destination === null) throw new LineIsolatedVerificationError("LINE_ISOLATED_PAYLOAD_INVALID");
  const events = await Promise.all(parsed.events.map(normalizeEvent));
  return Object.freeze({
    contractVersion: 1,
    destinationPresent: destination !== null,
    destinationTrustedAsTenantAuthority: false,
    eventCount: events.length,
    events: Object.freeze(events),
  });
}
