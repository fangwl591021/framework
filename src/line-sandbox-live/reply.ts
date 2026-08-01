import type { LineFetch, LineReplyResult, LineReplyTransport } from "./models";

const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";
const MAX_REPLY_TEXT_CODE_POINTS = 5_000;

export function createLineReplyTransport(fetcher: LineFetch = fetch): LineReplyTransport {
  return Object.freeze({
    async reply(replyToken: string, text: string, accessToken: string): Promise<LineReplyResult> {
      if (!accessToken) return result("config_missing", "WEBHOOK_REPLY_CONFIG_MISSING");
      const boundedText = Array.from(text).slice(0, MAX_REPLY_TEXT_CODE_POINTS).join("");
      try {
        const response = await fetcher(LINE_REPLY_ENDPOINT, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ replyToken, messages: [{ type: "text", text: boundedText }] }),
        });
        if (response.ok) return result("sent", "WEBHOOK_REPLY_SENT");
        if (response.status >= 400 && response.status < 500) return result("provider_4xx", "WEBHOOK_REPLY_PROVIDER_4XX");
        return result("provider_5xx", "WEBHOOK_REPLY_PROVIDER_5XX");
      } catch {
        return result("network_error", "WEBHOOK_REPLY_NETWORK_ERROR");
      }
    },
  });
}

function result(status: LineReplyResult["status"], reasonCode: LineReplyResult["reasonCode"]): LineReplyResult {
  return Object.freeze({ status, reasonCode, attempts: 1 });
}
