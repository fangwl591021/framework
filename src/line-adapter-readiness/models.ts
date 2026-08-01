export const lineReadinessLifecycle = "readiness_candidate" as const;
export const lineRealAdapterStatus = "disabled" as const;

export const lineWebhookEventTypes = Object.freeze([
  "message.text",
  "message.image",
  "message.video",
  "message.audio",
  "message.file",
  "message.location",
  "message.sticker",
  "follow",
  "unfollow",
  "join",
  "leave",
  "member_joined",
  "member_left",
  "postback",
  "video_play_complete",
  "beacon",
  "account_link",
  "things",
  "unsend",
] as const);
export type LineWebhookEventType = (typeof lineWebhookEventTypes)[number];

export const lineSourceTypes = Object.freeze(["user", "group", "room", "none"] as const);
export type LineSourceType = (typeof lineSourceTypes)[number];

export interface LineWebhookEventMetadata {
  readonly contractVersion: 1;
  readonly eventType: LineWebhookEventType;
  readonly webhookEventId: string;
  readonly timestamp: number;
  readonly sourceType: LineSourceType;
  readonly isRedelivery: boolean;
  readonly textLength: number;
  readonly replyTokenPresent: boolean;
}

export interface LineCredentialReferences {
  readonly provider: "line";
  readonly state: "not_provisioned" | "planned_reference";
  readonly signatureKeyReference: string | null;
  readonly deliveryCredentialReference: string | null;
  readonly containsCredentialValue: false;
}

export type LineResponseKind =
  | "text"
  | "confirmation"
  | "cards"
  | "image"
  | "video"
  | "audio"
  | "location"
  | "sticker"
  | "unsupported";

export interface LineCapabilityDecision {
  readonly input: LineResponseKind;
  readonly plannedOutput: "text" | "flex" | "image" | "video" | "audio" | "location" | "sticker" | "no_reply";
  readonly disposition: "supported" | "degraded" | "rejected";
  readonly reasonCode: string;
  readonly executable: false;
}

export interface LineSafeEvidence {
  readonly evidenceVersion: 1;
  readonly adapterKey: "disabled_line_adapter";
  readonly lifecycle: "readiness_candidate";
  readonly status: "simulated" | "rejected" | "no_go";
  readonly reasonCode: string;
  readonly eventType: LineWebhookEventType | null;
  readonly replayKeyDigestPrefix: string | null;
  readonly latencyBucket: "none" | "fast" | "standard" | "slow";
  readonly supportCode: string;
  readonly networkUsed: false;
}

export class LineReadinessError extends Error {
  constructor(readonly code:
    | "LINE_EVENT_INVALID"
    | "LINE_EVENT_UNSUPPORTED"
    | "LINE_EVENT_STALE"
    | "LINE_EVENT_FROM_FUTURE"
    | "LINE_SIGNATURE_MISSING"
    | "LINE_SIGNATURE_INVALID"
    | "LINE_REPLY_TOKEN_EXPIRED"
    | "LINE_REPLY_TOKEN_CONSUMED"
    | "LINE_CREDENTIAL_REFERENCE_INVALID") {
    super(code);
    this.name = "LineReadinessError";
  }
}
