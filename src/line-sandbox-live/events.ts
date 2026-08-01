import type { LineTextMessageEvent } from "./models";

export const MAX_LINE_WEBHOOK_BYTES = 1_048_576;
export const MAX_LINE_EVENTS = 100;
export const MAX_LINE_INPUT_TEXT_CODE_POINTS = 4_900;

export async function readBoundedRawBody(request: Request, maximumBytes = MAX_LINE_WEBHOOK_BYTES): Promise<Uint8Array | null> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maximumBytes) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel("body_limit_exceeded");
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export function parseLineWebhookEvents(rawBody: Uint8Array): { ok: true; events: readonly LineTextMessageEvent[]; unsupportedCount: number } | { ok: false; reason: "invalid" | "too_many_events" } {
  let payload: unknown;
  try { payload = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(rawBody)); } catch { return { ok: false, reason: "invalid" }; }
  if (!isRecord(payload) || !Array.isArray(payload.events)) return { ok: false, reason: "invalid" };
  if (payload.events.length > MAX_LINE_EVENTS) return { ok: false, reason: "too_many_events" };
  const events: LineTextMessageEvent[] = [];
  let unsupportedCount = 0;
  for (const event of payload.events) {
    if (!isRecord(event) || event.type !== "message" || typeof event.replyToken !== "string" || !isRecord(event.message) || event.message.type !== "text" || typeof event.message.text !== "string") { unsupportedCount += 1; continue; }
    if (event.replyToken.length < 1 || event.replyToken.length > 256) { unsupportedCount += 1; continue; }
    const codePoints = Array.from(event.message.text);
    const text = codePoints.slice(0, MAX_LINE_INPUT_TEXT_CODE_POINTS).join("");
    events.push(Object.freeze({ replyToken: event.replyToken, text }));
  }
  return { ok: true, events: Object.freeze(events), unsupportedCount };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
