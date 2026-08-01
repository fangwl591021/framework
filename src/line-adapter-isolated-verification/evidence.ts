import type { IsolatedLineVerificationEvidence, LineReplayDisposition, NormalizedIsolatedLineEvent } from "./models";

export function buildIsolatedLineEvidence(
  event: NormalizedIsolatedLineEvent,
  replayDisposition: LineReplayDisposition,
): IsolatedLineVerificationEvidence {
  const reasonCode = replayDisposition === "accepted"
    ? "LINE_ISOLATED_EVENT_ACCEPTED"
    : replayDisposition === "replay"
      ? "LINE_ISOLATED_EVENT_REPLAY"
      : "LINE_ISOLATED_EVENT_CONFLICT";
  const prefix = event.payloadDigest.slice(0, 12);
  return Object.freeze({
    evidenceVersion: 1,
    lifecycle: "isolated_verification_candidate",
    adapterKey: "disabled_line_adapter",
    transport: "fake_only",
    webhookEventId: event.webhookEventId,
    providerEventType: event.providerEventType,
    replayDisposition,
    isRedelivery: event.isRedelivery,
    payloadDigestPrefix: prefix,
    reasonCode,
    supportCode: `LN-IV-${prefix.toUpperCase()}`,
    networkUsed: false,
  });
}
