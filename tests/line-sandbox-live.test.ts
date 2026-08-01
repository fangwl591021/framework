import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { MAX_LINE_EVENTS, MAX_LINE_INPUT_TEXT_CODE_POINTS } from "../src/line-sandbox-live/events";
import type { LineReplyTransport, LineSafeLogger, LineSandboxEnv } from "../src/line-sandbox-live/models";
import { createLineReplyTransport } from "../src/line-sandbox-live/reply";
import { verifyLineSignature } from "../src/line-sandbox-live/signature";
import { createLineSandboxWorker } from "../src/line-sandbox-live/worker";

const FAKE_BINDING_KEY = "test-public-binding";
const FAKE_CHANNEL_SECRET = "test-only-channel-secret-not-real";
const FAKE_ACCESS_TOKEN = "test-only-access-token-not-real";
const env: LineSandboxEnv = { LINE_BINDING_KEY: FAKE_BINDING_KEY, LINE_CHANNEL_SECRET: FAKE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN: FAKE_ACCESS_TOKEN };

function signature(body: string): string { return createHmac("sha256", FAKE_CHANNEL_SECRET).update(body).digest("base64"); }
function webhook(body: string, signed = true, bindingKey = FAKE_BINDING_KEY): Request { return new Request(`https://sandbox.invalid/webhook/${bindingKey}`, { method: "POST", headers: signed ? { "x-line-signature": signature(body), "content-type": "application/json" } : { "content-type": "application/json" }, body }); }
function textPayload(text = "hello", extras: Record<string, unknown> = {}): string { return JSON.stringify({ events: [{ type: "message", replyToken: "test-reply-token-not-real", source: { userId: "test-user-id-not-real" }, message: { type: "text", text }, ...extras }] }); }
function captureLogger(): { logger: LineSafeLogger; codes: string[] } { const codes: string[] = []; return { codes, logger: { log(code) { codes.push(code); } } }; }
function captureReplies(resultStatus: "sent" | "provider_4xx" | "provider_5xx" = "sent") { const calls: Array<{ replyToken: string; text: string; accessToken: string }> = []; const reasonCode = resultStatus === "sent" ? "WEBHOOK_REPLY_SENT" : resultStatus === "provider_4xx" ? "WEBHOOK_REPLY_PROVIDER_4XX" : "WEBHOOK_REPLY_PROVIDER_5XX"; const transport: LineReplyTransport = { async reply(replyToken, text, accessToken) { calls.push({ replyToken, text, accessToken }); return { status: resultStatus, reasonCode, attempts: 1 }; } }; return { calls, transport }; }

describe("LINE Sandbox Live Integration", () => {
  describe("signature verification", () => {
    it("accepts an official-style HMAC-SHA256 Base64 signature vector", async () => { const body = JSON.stringify({ events: [] }); expect(await verifyLineSignature(new TextEncoder().encode(body), signature(body), FAKE_CHANNEL_SECRET)).toBe(true); });
    it("rejects an invalid signature", async () => expect(await verifyLineSignature(new TextEncoder().encode("{}"), "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", FAKE_CHANNEL_SECRET)).toBe(false));
    it("rejects malformed Base64", async () => expect(await verifyLineSignature(new TextEncoder().encode("{}"), "not-base64", FAKE_CHANNEL_SECRET)).toBe(false));
  });

  describe("health and binding-aware routing", () => {
    it("reports the configured public binding key without credentials", async () => {
      const response = await createLineSandboxWorker().fetch(new Request("https://sandbox.invalid/health"), env);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok", service: "line-sandbox-live", bindingConfigured: true, bindingKey: FAKE_BINDING_KEY });
    });
    it("omits a missing or malformed binding key from health", async () => {
      const response = await createLineSandboxWorker().fetch(new Request("https://sandbox.invalid/health"), { ...env, LINE_BINDING_KEY: "Bad!" });
      expect(await response.json()).toEqual({ status: "ok", service: "line-sandbox-live", bindingConfigured: false });
    });
    it("returns 404 for unknown routes", async () => expect((await createLineSandboxWorker().fetch(new Request("https://sandbox.invalid/unknown"), env)).status).toBe(404));
    it.each([
      "/webhook",
      "/webhook/unknown-binding",
      "/webhook/Bad!",
      `/webhook/${FAKE_BINDING_KEY}/extra`,
      `/other/${FAKE_BINDING_KEY}`,
    ])("isolates missing, unknown, malformed, and mismatched routes: %s", async (pathname) => {
      const request = new Request(`https://sandbox.invalid${pathname}`, { method: "POST", body: "sensitive-body" });
      const response = await createLineSandboxWorker().fetch(request, env);
      expect(response.status).toBe(404);
      expect(request.bodyUsed).toBe(false);
    });
    it("does not process an unknown binding body or invoke another binding identity", async () => {
      const replies = captureReplies();
      const request = webhook(textPayload("must-not-process"), true, "other-public-binding");
      const response = await createLineSandboxWorker({ replyTransport: replies.transport }).fetch(request, env);
      expect(response.status).toBe(404);
      expect(request.bodyUsed).toBe(false);
      expect(replies.calls).toEqual([]);
    });
  });

  describe("webhook authentication and parsing order", () => {
    it("rejects a missing signature with 401", async () => expect((await createLineSandboxWorker().fetch(webhook("{}", false), env)).status).toBe(401));
    it("rejects invalid signature before parsing malformed JSON", async () => expect((await createLineSandboxWorker().fetch(webhook("not-json"), env)).status).toBe(400));
    it("rejects a mismatched signature before parsing", async () => { const request = new Request(`https://sandbox.invalid/webhook/${FAKE_BINDING_KEY}`, { method: "POST", headers: { "x-line-signature": signature("{}") }, body: "not-json" }); expect((await createLineSandboxWorker().fetch(request, env)).status).toBe(401); });
    it.each([{ LINE_BINDING_KEY: FAKE_BINDING_KEY, LINE_CHANNEL_ACCESS_TOKEN: FAKE_ACCESS_TOKEN }, { LINE_BINDING_KEY: FAKE_BINDING_KEY, LINE_CHANNEL_SECRET: FAKE_CHANNEL_SECRET }])("fails closed when credentials are missing", async (missingEnv) => expect((await createLineSandboxWorker().fetch(webhook("{}"), missingEnv)).status).toBe(503));
    it("fails closed with 404 when the configured binding key is missing", async () => expect((await createLineSandboxWorker().fetch(webhook("{}"), { LINE_CHANNEL_SECRET: FAKE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN: FAKE_ACCESS_TOKEN })).status).toBe(404));
    it("consumes the request body once", async () => { const request = webhook(JSON.stringify({ events: [] })); expect(request.bodyUsed).toBe(false); await createLineSandboxWorker().fetch(request, env); expect(request.bodyUsed).toBe(true); });
  });

  describe("event processing", () => {
    it("accepts an empty verification payload", async () => { const replies = captureReplies(); const response = await createLineSandboxWorker({ replyTransport: replies.transport }).fetch(webhook(JSON.stringify({ events: [] })), env); expect(response.status).toBe(200); expect(replies.calls).toEqual([]); });
    it("replies to a text event", async () => { const replies = captureReplies(); const response = await createLineSandboxWorker({ replyTransport: replies.transport }).fetch(webhook(textPayload("你好")), env); expect(response.status).toBe(200); expect(replies.calls).toEqual([{ replyToken: "test-reply-token-not-real", text: "收到：你好", accessToken: FAKE_ACCESS_TOKEN }]); });
    it("ignores unsupported events safely", async () => { const replies = captureReplies(); const logger = captureLogger(); const body = JSON.stringify({ events: [{ type: "follow", source: { userId: "test-user-id-not-real" } }] }); const response = await createLineSandboxWorker({ replyTransport: replies.transport, logger: logger.logger }).fetch(webhook(body), env); expect(response.status).toBe(200); expect(replies.calls).toEqual([]); expect(logger.codes).toContain("WEBHOOK_EVENT_UNSUPPORTED"); });
    it("ignores non-text message events", async () => { const replies = captureReplies(); const body = JSON.stringify({ events: [{ type: "message", replyToken: "test-reply-token-not-real", message: { type: "image", id: "image-id" } }] }); expect((await createLineSandboxWorker({ replyTransport: replies.transport }).fetch(webhook(body), env)).status).toBe(200); expect(replies.calls).toEqual([]); });
    it("rejects more than the bounded event count", async () => { const replies = captureReplies(); const body = JSON.stringify({ events: Array.from({ length: MAX_LINE_EVENTS + 1 }, () => ({ type: "follow" })) }); expect((await createLineSandboxWorker({ replyTransport: replies.transport }).fetch(webhook(body), env)).status).toBe(400); expect(replies.calls).toEqual([]); });
    it("bounds input text by Unicode code points", async () => { const replies = captureReplies(); const longText = "😀".repeat(MAX_LINE_INPUT_TEXT_CODE_POINTS + 20); await createLineSandboxWorker({ replyTransport: replies.transport }).fetch(webhook(textPayload(longText)), env); expect(Array.from(replies.calls[0]!.text)).toHaveLength(MAX_LINE_INPUT_TEXT_CODE_POINTS + 3); });
  });

  describe("isolated reply transport", () => {
    it("uses the exact endpoint, headers, and bounded JSON", async () => { const captured: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []; const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => { captured.push(init === undefined ? { input } : { input, init }); return new Response(null, { status: 200 }); }; const result = await createLineReplyTransport(fetcher).reply("fake-reply-ref", "收到：hello", FAKE_ACCESS_TOKEN); expect(result).toEqual({ status: "sent", reasonCode: "WEBHOOK_REPLY_SENT", attempts: 1 }); expect(captured).toHaveLength(1); expect(captured[0]!.input).toBe("https://api.line.me/v2/bot/message/reply"); expect(captured[0]!.init).toMatchObject({ method: "POST", headers: { Authorization: `Bearer ${FAKE_ACCESS_TOKEN}`, "Content-Type": "application/json" } }); expect(JSON.parse(String(captured[0]!.init!.body))).toEqual({ replyToken: "fake-reply-ref", messages: [{ type: "text", text: "收到：hello" }] }); });
    it.each([[400, "provider_4xx", "WEBHOOK_REPLY_PROVIDER_4XX"], [429, "provider_4xx", "WEBHOOK_REPLY_PROVIDER_4XX"], [500, "provider_5xx", "WEBHOOK_REPLY_PROVIDER_5XX"], [503, "provider_5xx", "WEBHOOK_REPLY_PROVIDER_5XX"]] as const)("classifies provider %s without retry", async (status, expectedStatus, reasonCode) => { const fetcher = vi.fn(async () => new Response(null, { status })); expect(await createLineReplyTransport(fetcher).reply("fake-reply-ref", "text", FAKE_ACCESS_TOKEN)).toEqual({ status: expectedStatus, reasonCode, attempts: 1 }); expect(fetcher).toHaveBeenCalledTimes(1); });
    it("classifies a network failure without retry", async () => { const fetcher = vi.fn(async () => { throw new Error("simulated"); }); expect(await createLineReplyTransport(fetcher).reply("fake-reply-ref", "text", FAKE_ACCESS_TOKEN)).toEqual({ status: "network_error", reasonCode: "WEBHOOK_REPLY_NETWORK_ERROR", attempts: 1 }); expect(fetcher).toHaveBeenCalledTimes(1); });
    it("fails closed before fetch when access token is missing", async () => { const fetcher = vi.fn(async () => new Response()); expect(await createLineReplyTransport(fetcher).reply("fake-reply-ref", "text", "")).toEqual({ status: "config_missing", reasonCode: "WEBHOOK_REPLY_CONFIG_MISSING", attempts: 1 }); expect(fetcher).not.toHaveBeenCalled(); });
  });

  describe("safe provider failure handling and logging", () => {
    it.each(["provider_4xx", "provider_5xx"] as const)("returns webhook 200 after %s", async (status) => { const replies = captureReplies(status); const logger = captureLogger(); const response = await createLineSandboxWorker({ replyTransport: replies.transport, logger: logger.logger }).fetch(webhook(textPayload()), env); expect(response.status).toBe(200); expect(replies.calls).toHaveLength(1); expect(logger.codes).toContain(status === "provider_4xx" ? "WEBHOOK_REPLY_PROVIDER_4XX" : "WEBHOOK_REPLY_PROVIDER_5XX"); });
    it("logs only bounded reason codes", async () => { const replies = captureReplies(); const logger = captureLogger(); await createLineSandboxWorker({ replyTransport: replies.transport, logger: logger.logger }).fetch(webhook(textPayload("sensitive-body")), env); const logText = logger.codes.join(" "); expect(logText).toBe("WEBHOOK_REPLY_SENT WEBHOOK_ACCEPTED"); expect(logText).not.toMatch(/sensitive-body|test-user-id|test-reply-token|test-only|authorization/i); });
  });
});
