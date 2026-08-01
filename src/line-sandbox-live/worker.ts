import { isValidPublicLineBindingKey, resolveLineBinding } from "./binding";
import { MAX_LINE_WEBHOOK_BYTES, parseLineWebhookEvents, readBoundedRawBody } from "./events";
import type { LineReplyTransport, LineSafeLogger, LineSandboxEnv, LineSandboxReasonCode } from "./models";
import { createLineReplyTransport } from "./reply";
import { verifyLineSignature } from "./signature";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

const defaultLogger: LineSafeLogger = Object.freeze({ log(reasonCode: LineSandboxReasonCode) { console.log(JSON.stringify({ reasonCode })); } });

export function createLineSandboxWorker(dependencies: Readonly<{ replyTransport?: LineReplyTransport; logger?: LineSafeLogger }> = {}) {
  const replyTransport = dependencies.replyTransport ?? createLineReplyTransport();
  const logger = dependencies.logger ?? defaultLogger;
  return Object.freeze({
    async fetch(request: Request, env: LineSandboxEnv): Promise<Response> {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        const bindingConfigured = isValidPublicLineBindingKey(env.LINE_BINDING_KEY);
        return json(200, bindingConfigured
          ? { status: "ok", service: "line-sandbox-live", bindingConfigured, bindingKey: env.LINE_BINDING_KEY }
          : { status: "ok", service: "line-sandbox-live", bindingConfigured });
      }
      if (request.method !== "POST") return json(404, { error: "not_found" });
      const resolution = resolveLineBinding(url.pathname, env);
      if (!resolution.ok) {
        if (resolution.status === 404) return json(404, { error: "not_found" });
        return logged(logger, resolution.reasonCode, resolution.status);
      }
      const { binding } = resolution;
      const signature = request.headers.get("x-line-signature");
      if (!signature) return logged(logger, "WEBHOOK_SIGNATURE_MISSING", 401);
      const rawBody = await readBoundedRawBody(request, MAX_LINE_WEBHOOK_BYTES);
      if (!rawBody) return logged(logger, "WEBHOOK_BODY_TOO_LARGE", 413);
      if (!(await verifyLineSignature(rawBody, signature, binding.channelSecret))) return logged(logger, "WEBHOOK_SIGNATURE_INVALID", 401);
      const parsed = parseLineWebhookEvents(rawBody);
      if (!parsed.ok) return logged(logger, parsed.reason === "too_many_events" ? "WEBHOOK_EVENT_LIMIT_EXCEEDED" : "WEBHOOK_PAYLOAD_INVALID", 400);
      if (parsed.unsupportedCount > 0) logger.log("WEBHOOK_EVENT_UNSUPPORTED");
      for (const event of parsed.events) {
        const reply = await replyTransport.reply(event.replyToken, `收到：${event.text}`, binding.channelAccessToken);
        logger.log(reply.reasonCode);
      }
      logger.log("WEBHOOK_ACCEPTED");
      return json(200, { status: "accepted" });
    },
  });
}

function logged(logger: LineSafeLogger, reasonCode: LineSandboxReasonCode, status: number): Response { logger.log(reasonCode); return json(status, { error: reasonCode.toLowerCase() }); }
function json(status: number, body: Readonly<Record<string, string | boolean>>): Response { return new Response(JSON.stringify(body), { status, headers: jsonHeaders }); }

export default createLineSandboxWorker() satisfies ExportedHandler<LineSandboxEnv>;
