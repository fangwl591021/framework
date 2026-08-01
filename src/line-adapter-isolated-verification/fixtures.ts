export const isolatedLineFixtureKey = new TextEncoder().encode("isolated-line-fixture-key-v1-not-a-credential");

const base = Object.freeze({
  mode: "active",
  timestamp: 1_700_000_000_000,
  source: Object.freeze({ type: "user", userId: "U00000000000000000000000000000001" }),
  webhookEventId: "01ISOLATEDLINEEVENT00000001",
  deliveryContext: Object.freeze({ isRedelivery: false }),
});

export const isolatedLineFixtures = Object.freeze({
  emptyEvents: Object.freeze({ destination: "U00000000000000000000000000000000", events: Object.freeze([]) }),
  text: Object.freeze({ ...base, type: "message", replyToken: "reply-token-local-fixture", message: Object.freeze({ id: "1001", type: "text", text: "hello LINE" }) }),
  file: Object.freeze({ ...base, webhookEventId: "01ISOLATEDLINEEVENT00000002", type: "message", replyToken: "reply-token-file-fixture", message: Object.freeze({ id: "1002", type: "file", fileName: "safe.pdf", fileSize: 100 }) }),
  location: Object.freeze({ ...base, webhookEventId: "01ISOLATEDLINEEVENT00000003", type: "message", replyToken: "reply-token-location-fixture", message: Object.freeze({ id: "1003", type: "location", title: "Location", address: "Address", latitude: 25.04, longitude: 121.56 }) }),
  follow: Object.freeze({ ...base, webhookEventId: "01ISOLATEDLINEEVENT00000004", type: "follow", replyToken: "reply-token-follow-fixture" }),
  unfollow: Object.freeze({ ...base, webhookEventId: "01ISOLATEDLINEEVENT00000005", type: "unfollow" }),
  postback: Object.freeze({ ...base, webhookEventId: "01ISOLATEDLINEEVENT00000006", type: "postback", replyToken: "reply-token-postback-fixture", postback: Object.freeze({ data: "action=fixture" }) }),
} as const);

export function isolatedWebhookBody(event: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ destination: "U00000000000000000000000000000000", events: [event] }));
}
