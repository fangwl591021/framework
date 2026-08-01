export const lineIsolatedVerificationStatus = Object.freeze({
  lifecycle: "isolated_verification_candidate",
  realAdapter: "disabled",
  providerTransport: "fake_only",
  credentials: "not_provisioned",
  publicWebhook: "not_created",
  remoteD1: "not_used",
  deployment: "not_performed",
  productionUse: "not_allowed",
  authority: "workbench_only",
} as const);

export const isolatedLineEventTypes = Object.freeze([
  "message.text",
  "message.file",
  "message.location",
  "follow",
  "unfollow",
  "postback",
] as const);
export type IsolatedLineEventType = (typeof isolatedLineEventTypes)[number];

export type IsolatedChannelEventType = "text_message" | "postback" | "follow" | "unfollow" | "unsupported";
export type IsolatedLineSourceType = "user" | "group" | "room" | "none";

export interface LineTransientProviderReferences {
  readonly persistence: "forbidden";
  readonly sourceLookupReference: string | null;
  readonly replyToken: string | null;
}

export interface NormalizedIsolatedLineEvent {
  readonly contractVersion: 1;
  readonly webhookEventId: string;
  readonly providerEventType: IsolatedLineEventType;
  readonly channelEventType: IsolatedChannelEventType;
  readonly timestamp: number;
  readonly sourceType: IsolatedLineSourceType;
  readonly sourceLookupOnly: true;
  readonly isRedelivery: boolean;
  readonly redeliveryIsEvidenceOnly: true;
  readonly contentClass: "text" | "file" | "location" | "postback" | "none";
  readonly contentLength: number;
  readonly payloadDigest: string;
  readonly transient: LineTransientProviderReferences;
}

export interface NormalizedIsolatedLineWebhook {
  readonly contractVersion: 1;
  readonly destinationPresent: boolean;
  readonly destinationTrustedAsTenantAuthority: false;
  readonly eventCount: number;
  readonly events: readonly NormalizedIsolatedLineEvent[];
}

export type LineReplayDisposition = "accepted" | "replay" | "conflict";

export interface IsolatedLineVerificationEvidence {
  readonly evidenceVersion: 1;
  readonly lifecycle: "isolated_verification_candidate";
  readonly adapterKey: "disabled_line_adapter";
  readonly transport: "fake_only";
  readonly webhookEventId: string;
  readonly providerEventType: IsolatedLineEventType;
  readonly replayDisposition: LineReplayDisposition;
  readonly isRedelivery: boolean;
  readonly payloadDigestPrefix: string;
  readonly reasonCode: string;
  readonly supportCode: string;
  readonly networkUsed: false;
}

export interface IsolatedLineWebhookDecision {
  readonly httpStatusDecision: 200;
  readonly status: "verification_accepted" | "events_evaluated";
  readonly destinationTrustedAsTenantAuthority: false;
  readonly events: readonly Readonly<{
    webhookEventId: string;
    disposition: LineReplayDisposition;
    evidence: IsolatedLineVerificationEvidence;
  }>[];
  readonly workbenchInvoked: false;
  readonly networkUsed: false;
}

export type FakeLineTransportScenario = "success" | "transient_failure" | "permanent_failure" | "rate_limited";
export type FakeLineRetryAfterClass = "none" | "short" | "standard";

export interface FakeLineTransportRequest {
  readonly operation: "reply";
  readonly eventKey: string;
  readonly replyToken: string;
  readonly messages: readonly Readonly<{ type: "text"; text: string }>[];
}

export interface FakeLineTransportRecord {
  readonly operation: "reply";
  readonly eventKey: string;
  readonly messageCount: number;
  readonly totalTextUnits: number;
  readonly networkUsed: false;
}

export interface FakeLineTransportResult {
  readonly status: "simulated_succeeded" | "transient_failure" | "terminal_failure" | "rate_limited" | "disabled" | "kill_switch";
  readonly retrySafe: boolean;
  readonly retryAfterClass: FakeLineRetryAfterClass;
  readonly reasonCode: string;
  readonly networkUsed: false;
}

export class LineIsolatedVerificationError extends Error {
  constructor(readonly code:
    | "LINE_ISOLATED_PAYLOAD_INVALID"
    | "LINE_ISOLATED_PAYLOAD_TOO_LARGE"
    | "LINE_ISOLATED_EVENT_UNSUPPORTED"
    | "LINE_ISOLATED_EVENT_ID_REQUIRED"
    | "LINE_ISOLATED_SIGNATURE_MISSING"
    | "LINE_ISOLATED_SIGNATURE_INVALID"
    | "LINE_ISOLATED_REPLY_TOKEN_INVALID"
    | "LINE_ISOLATED_REPLY_TOKEN_EXPIRED"
    | "LINE_ISOLATED_REPLY_TOKEN_USED"
    | "LINE_ISOLATED_REPLY_TOKEN_REDELIVERY_UNVERIFIED"
    | "LINE_ISOLATED_TRANSPORT_INVALID") {
    super(code);
    this.name = "LineIsolatedVerificationError";
  }
}
