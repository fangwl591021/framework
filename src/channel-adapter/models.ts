export const channelTypes = ["web", "line", "telegram", "generic_webhook"] as const;
export type ChannelType = (typeof channelTypes)[number];
export const channelEventTypes = ["text_message", "postback", "follow", "unfollow", "join", "leave", "delivery_receipt", "unsupported"] as const;
export type ChannelEventType = (typeof channelEventTypes)[number];

export interface ChannelCapabilities {
  readonly maxTextLength: number;
  readonly maxMessages: number;
  readonly supportsButtons: boolean;
  readonly supportsCards: boolean;
  readonly supportsReplyToken: boolean;
  readonly supportsPush: boolean;
  readonly supportsRichMenu: boolean;
  readonly localeSupport: readonly string[];
}
export interface ChannelAccount {
  readonly channelAccountKey: string;
  readonly channelType: ChannelType;
  readonly tenantId: string;
  readonly applicationId: string;
  readonly adapterKey: string;
  readonly status: "draft" | "enabled_local_only" | "disabled" | "suspended" | "revoked";
  readonly signaturePolicyVersion: number;
  readonly responsePolicyVersion: number;
  readonly secretReference: string | null;
  readonly version: number;
}
export interface ChannelInboundEvent {
  readonly contractVersion: 1;
  readonly eventId: string;
  readonly channelType: ChannelType;
  readonly channelAccountKey: string;
  readonly externalEventId: string;
  readonly eventType: ChannelEventType;
  readonly occurredAt: number;
  readonly receivedAt: number;
  readonly payloadDigest: string;
  readonly signatureDigest: string;
  readonly deliveryAttempt: number;
  readonly replyTokenReference: string | null;
  readonly externalUserReference: string | null;
  readonly conversationReference: string | null;
  readonly metadataVersion: number;
  readonly text: string | null;
}
export interface TrustedChannelContext {
  readonly source: "trusted_channel_context";
  readonly tenantId: string;
  readonly applicationId: string;
  readonly membershipId: string;
  readonly identityId: string;
  readonly channelAccountKey: string;
  readonly channelType: ChannelType;
  readonly correlationId: string;
}
export type ChannelNeutralResponse = Readonly<{
  type: "text" | "confirmation" | "cards" | "error" | "unsupported" | "no_reply";
  text: string;
  choices?: readonly string[];
  cards?: readonly Readonly<{ title: string; body: string }>[];
  supportCode?: string | null;
}>;
export interface RenderedChannelResponse {
  readonly responseType: ChannelNeutralResponse["type"];
  readonly messages: readonly string[];
  readonly truncated: boolean;
  readonly networkUsed: false;
}
export interface ChannelProcessResult {
  readonly deliveryRecordId: string | null;
  readonly status: "completed" | "replayed" | "processing" | "rejected";
  readonly response: RenderedChannelResponse;
  readonly supportCode: string;
}
export class ChannelAdapterError extends Error {
  constructor(readonly code:
    | "CHANNEL_SIGNATURE_MISSING" | "CHANNEL_SIGNATURE_INVALID" | "CHANNEL_SIGNATURE_EXPIRED"
    | "CHANNEL_ADAPTER_DISABLED" | "CHANNEL_ACCOUNT_NOT_FOUND" | "CHANNEL_ACCOUNT_DISABLED"
    | "CHANNEL_PAYLOAD_TOO_LARGE" | "CHANNEL_PAYLOAD_INVALID" | "CHANNEL_EVENT_CONFLICT"
    | "CHANNEL_DELIVERY_PROCESSING" | "CHANNEL_STALE_COMPLETION" | "CHANNEL_IDENTITY_MISMATCH"
    | "CHANNEL_TRAFFIC_REJECTED" | "CHANNEL_RESPONSE_UNSAFE" | "CHANNEL_STORAGE_FAILED") {
    super(code);
    this.name = "ChannelAdapterError";
  }
}

