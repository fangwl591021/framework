export interface LineSandboxEnv {
  readonly LINE_BINDING_KEY?: string;
  readonly LINE_CHANNEL_SECRET?: string;
  readonly LINE_CHANNEL_ACCESS_TOKEN?: string;
}

export interface ResolvedLineBinding {
  readonly bindingKey: string;
  readonly channelSecret: string;
  readonly channelAccessToken: string;
  readonly source: "trusted_environment";
}

export type LineBindingResolution =
  | Readonly<{ ok: true; binding: ResolvedLineBinding }>
  | Readonly<{ ok: false; status: 404 | 503; reasonCode: "WEBHOOK_BINDING_NOT_FOUND" | "WEBHOOK_CONFIG_MISSING" }>;

export type LineSandboxReasonCode =
  | "WEBHOOK_ACCEPTED"
  | "WEBHOOK_BINDING_NOT_FOUND"
  | "WEBHOOK_SIGNATURE_MISSING"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "WEBHOOK_BODY_TOO_LARGE"
  | "WEBHOOK_PAYLOAD_INVALID"
  | "WEBHOOK_EVENT_LIMIT_EXCEEDED"
  | "WEBHOOK_EVENT_UNSUPPORTED"
  | "WEBHOOK_REPLY_SENT"
  | "WEBHOOK_REPLY_PROVIDER_4XX"
  | "WEBHOOK_REPLY_PROVIDER_5XX"
  | "WEBHOOK_REPLY_NETWORK_ERROR"
  | "WEBHOOK_REPLY_CONFIG_MISSING"
  | "WEBHOOK_CONFIG_MISSING";

export interface LineTextMessageEvent {
  readonly replyToken: string;
  readonly text: string;
}

export interface LineReplyResult {
  readonly status: "sent" | "provider_4xx" | "provider_5xx" | "network_error" | "config_missing";
  readonly reasonCode: Extract<LineSandboxReasonCode,
    | "WEBHOOK_REPLY_SENT"
    | "WEBHOOK_REPLY_PROVIDER_4XX"
    | "WEBHOOK_REPLY_PROVIDER_5XX"
    | "WEBHOOK_REPLY_NETWORK_ERROR"
    | "WEBHOOK_REPLY_CONFIG_MISSING">;
  readonly attempts: 1;
}

export interface LineReplyTransport {
  reply(replyToken: string, text: string, accessToken: string): Promise<LineReplyResult>;
}

export interface LineSafeLogger {
  log(reasonCode: LineSandboxReasonCode): void;
}

export type LineFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
