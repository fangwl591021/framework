import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FakeLineTransport,
  InMemoryReplyTokenLease,
  LineIsolatedVerificationHarness,
  isolatedLineFixtureKey,
  isolatedLineFixtures,
  isolatedLineSignatureVerificationContract,
  lineIsolatedVerificationStatus,
  isolatedReplyTokenPolicy,
  isolatedWebhookBody,
  normalizeVerifiedLineWebhook,
  officialPublishedEmptyEventsSignatureVector,
  officialPublishedVectorBytes,
  signIsolatedFixture,
  verifyIsolatedLineSignature,
} from "../src/line-adapter-isolated-verification";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function signedBody(value: unknown, key = isolatedLineFixtureKey) {
  const rawBody = encoder.encode(JSON.stringify(value));
  return Object.freeze({ rawBody, xLineSignature: await signIsolatedFixture(rawBody, key) });
}

async function signedEvent(event: unknown) {
  return signedBody({ destination: "U00000000000000000000000000000000", events: [event] });
}

describe("LINE Adapter Isolated Provider Verification", () => {
  describe("exact-byte signature verification", () => {
    it("passes the official published empty-events signature vector", async () => {
      const bytes = officialPublishedVectorBytes();
      await expect(verifyIsolatedLineSignature(bytes.rawBody, officialPublishedEmptyEventsSignatureVector.expectedSignatureBase64, bytes.fixtureKey)).resolves.toBeUndefined();
    });

    it("accepts exact signed UTF-8 bytes including emoji", async () => {
      const rawBody = encoder.encode('{"destination":"U00000000000000000000000000000000","events":[],"note":"安全✅"}');
      const signature = await signIsolatedFixture(rawBody, isolatedLineFixtureKey);
      await expect(verifyIsolatedLineSignature(rawBody, signature, isolatedLineFixtureKey)).resolves.toBeUndefined();
    });

    it("rejects JSON parsed and reformatted before verification", async () => {
      const bytes = officialPublishedVectorBytes();
      const reformatted = encoder.encode(JSON.stringify(JSON.parse(decoder.decode(bytes.rawBody)), null, 2));
      await expect(verifyIsolatedLineSignature(reformatted, officialPublishedEmptyEventsSignatureVector.expectedSignatureBase64, bytes.fixtureKey)).rejects.toThrow("LINE_ISOLATED_SIGNATURE_INVALID");
    });

    it("rejects whitespace mutation", async () => {
      const bytes = officialPublishedVectorBytes();
      await expect(verifyIsolatedLineSignature(encoder.encode(`${decoder.decode(bytes.rawBody)} `), officialPublishedEmptyEventsSignatureVector.expectedSignatureBase64, bytes.fixtureKey)).rejects.toThrow("LINE_ISOLATED_SIGNATURE_INVALID");
    });

    it("rejects LF to CRLF mutation", async () => {
      const rawBody = encoder.encode('{\n"destination":"U00000000000000000000000000000000","events":[]\n}');
      const signature = await signIsolatedFixture(rawBody, isolatedLineFixtureKey);
      await expect(verifyIsolatedLineSignature(encoder.encode(decoder.decode(rawBody).replaceAll("\n", "\r\n")), signature, isolatedLineFixtureKey)).rejects.toThrow("LINE_ISOLATED_SIGNATURE_INVALID");
    });

    it("rejects escaped-newline interpretation", async () => {
      const rawBody = encoder.encode('{"destination":"U00000000000000000000000000000000","events":[],"note":"a\\nb"}');
      const signature = await signIsolatedFixture(rawBody, isolatedLineFixtureKey);
      await expect(verifyIsolatedLineSignature(encoder.encode(decoder.decode(rawBody).replace("\\n", "\n")), signature, isolatedLineFixtureKey)).rejects.toThrow("LINE_ISOLATED_SIGNATURE_INVALID");
    });

    it("keeps emoji bytes stable", async () => {
      const rawBody = encoder.encode("✅🚦LINE");
      const signature = await signIsolatedFixture(rawBody, isolatedLineFixtureKey);
      await expect(verifyIsolatedLineSignature(rawBody, signature, isolatedLineFixtureKey)).resolves.toBeUndefined();
      await expect(verifyIsolatedLineSignature(encoder.encode("✅🚦Line"), signature, isolatedLineFixtureKey)).rejects.toThrow("LINE_ISOLATED_SIGNATURE_INVALID");
    });

    it("fails closed when x-line-signature is missing", async () => {
      await expect(verifyIsolatedLineSignature(encoder.encode("{}"), null, isolatedLineFixtureKey)).rejects.toThrow("LINE_ISOLATED_SIGNATURE_MISSING");
    });

    it.each(["not-base64", "A".repeat(44), "===="])("fails closed for malformed Base64 %s", async (signature) => {
      await expect(verifyIsolatedLineSignature(encoder.encode("{}"), signature, isolatedLineFixtureKey)).rejects.toThrow("LINE_ISOLATED_SIGNATURE_INVALID");
    });

    it("fails closed with the wrong key", async () => {
      const bytes = officialPublishedVectorBytes();
      await expect(verifyIsolatedLineSignature(bytes.rawBody, officialPublishedEmptyEventsSignatureVector.expectedSignatureBase64, encoder.encode("wrong-fixture-key-value-0001"))).rejects.toThrow("LINE_ISOLATED_SIGNATURE_INVALID");
    });

    it("declares the Web Crypto constant-time comparison path", () => {
      expect(isolatedLineSignatureVerificationContract).toMatchObject({ comparisonPath: "web_crypto_subtle_verify", order: "before_parse_deserialize_normalize" });
    });
  });

  describe("webhook normalization, redelivery, and replay", () => {
    it("accepts the empty-events URL verification payload with a safe 200 decision", async () => {
      const bytes = officialPublishedVectorBytes();
      const result = await new LineIsolatedVerificationHarness(bytes.fixtureKey).verify({ channelAccountKey: "line-fixture", rawBody: bytes.rawBody, xLineSignature: officialPublishedEmptyEventsSignatureVector.expectedSignatureBase64 });
      expect(result).toMatchObject({ httpStatusDecision: 200, status: "verification_accepted", workbenchInvoked: false, networkUsed: false, events: [] });
    });

    it.each([
      ["text", "message.text", "text_message"],
      ["file", "message.file", "unsupported"],
      ["location", "message.location", "unsupported"],
      ["follow", "follow", "follow"],
      ["unfollow", "unfollow", "unfollow"],
      ["postback", "postback", "postback"],
    ] as const)("maps %s provider events", async (key, providerEventType, channelEventType) => {
      const normalized = await normalizeVerifiedLineWebhook(isolatedWebhookBody(isolatedLineFixtures[key]));
      expect(normalized.events[0]).toMatchObject({ providerEventType, channelEventType });
    });

    it("rejects unknown provider events safely", async () => {
      await expect(normalizeVerifiedLineWebhook(isolatedWebhookBody({ ...isolatedLineFixtures.follow, type: "future_event" }))).rejects.toThrow("LINE_ISOLATED_EVENT_UNSUPPORTED");
    });

    it("requires webhookEventId for processable events", async () => {
      const { webhookEventId: _removed, ...withoutId } = isolatedLineFixtures.text;
      await expect(normalizeVerifiedLineWebhook(isolatedWebhookBody(withoutId))).rejects.toThrow("LINE_ISOLATED_EVENT_ID_REQUIRED");
    });

    it("bounds destination and never trusts it as Tenant authority", async () => {
      const normalized = await normalizeVerifiedLineWebhook(isolatedWebhookBody(isolatedLineFixtures.text));
      expect(normalized).toMatchObject({ destinationPresent: true, destinationTrustedAsTenantAuthority: false });
      await expect(normalizeVerifiedLineWebhook(encoder.encode(JSON.stringify({ destination: "U".repeat(65), events: [] })))).rejects.toThrow("LINE_ISOLATED_PAYLOAD_INVALID");
    });

    it("marks source userId as lookup-only and never permission authority", async () => {
      const event = (await normalizeVerifiedLineWebhook(isolatedWebhookBody(isolatedLineFixtures.text))).events[0];
      expect(event).toMatchObject({ sourceLookupOnly: true, sourceType: "user", transient: { persistence: "forbidden" } });
      expect(JSON.stringify({ ...event, transient: undefined })).not.toMatch(/userId|permission|tenantId|applicationId/);
    });

    it("maps isRedelivery as evidence only", async () => {
      const redelivery = { ...isolatedLineFixtures.text, deliveryContext: { isRedelivery: true } };
      expect((await normalizeVerifiedLineWebhook(isolatedWebhookBody(redelivery))).events[0]).toMatchObject({ isRedelivery: true, redeliveryIsEvidenceOnly: true });
    });

    it("does not use timestamp as the dedup key for out-of-order events", async () => {
      const harness = new LineIsolatedVerificationHarness(isolatedLineFixtureKey);
      const later = await signedEvent({ ...isolatedLineFixtures.text, webhookEventId: "01ORDERLATER", timestamp: 2_000 });
      const earlier = await signedEvent({ ...isolatedLineFixtures.text, webhookEventId: "01ORDEREARLIER", timestamp: 1_000 });
      expect((await harness.verify({ channelAccountKey: "account", ...later })).events[0]?.disposition).toBe("accepted");
      expect((await harness.verify({ channelAccountKey: "account", ...earlier })).events[0]?.disposition).toBe("accepted");
    });

    it("maps duplicate webhookEventId to replay even when redelivery flag changes", async () => {
      const harness = new LineIsolatedVerificationHarness(isolatedLineFixtureKey);
      const first = await signedEvent(isolatedLineFixtures.text);
      const redelivered = await signedEvent({ ...isolatedLineFixtures.text, deliveryContext: { isRedelivery: true } });
      await harness.verify({ channelAccountKey: "account", ...first });
      expect((await harness.verify({ channelAccountKey: "account", ...redelivered })).events[0]?.disposition).toBe("replay");
    });

    it("maps the same ID with changed payload to conflict", async () => {
      const harness = new LineIsolatedVerificationHarness(isolatedLineFixtureKey);
      const first = await signedEvent(isolatedLineFixtures.text);
      const changed = await signedEvent({ ...isolatedLineFixtures.text, message: { ...isolatedLineFixtures.text.message, text: "HELLO line" } });
      await harness.verify({ channelAccountKey: "account", ...first });
      expect((await harness.verify({ channelAccountKey: "account", ...changed })).events[0]?.disposition).toBe("conflict");
    });
  });

  describe("reply-token lease", () => {
    const leaseInput = Object.freeze({ eventKey: "line:account:event-1", replyToken: "ephemeral-reply-token", eventTimestamp: 1_000, receivedAt: 1_100, now: 1_100, isRedelivery: false });

    it("declares transient-only single-use policy", () => {
      expect(isolatedReplyTokenPolicy).toMatchObject({ transientOnly: true, singleUse: true, receivedWindowMs: 60_000, persistence: "forbidden" });
    });

    it("never places the raw token in lease evidence", async () => {
      const leases = new InMemoryReplyTokenLease();
      await leases.acquire(leaseInput);
      expect(JSON.stringify(leases.evidence())).not.toContain(leaseInput.replyToken);
      expect(leases.evidence()[0]).toMatchObject({ tokenPersisted: false });
    });

    it("is usable once inside the one-minute boundary", async () => {
      const leases = new InMemoryReplyTokenLease();
      expect(await leases.acquire(leaseInput)).toMatchObject({ status: "available", expiresAt: 61_100 });
      expect(await leases.consume(leaseInput.eventKey, leaseInput.replyToken, 61_099)).toMatchObject({ status: "consumed" });
    });

    it("expires exactly at the one-minute boundary", async () => {
      const leases = new InMemoryReplyTokenLease();
      expect(await leases.acquire({ ...leaseInput, now: 61_100 })).toMatchObject({ status: "expired" });
    });

    it("rejects second use", async () => {
      const leases = new InMemoryReplyTokenLease();
      await leases.acquire(leaseInput);
      await leases.consume(leaseInput.eventKey, leaseInput.replyToken, 2_000);
      expect(await leases.consume(leaseInput.eventKey, leaseInput.replyToken, 2_001)).toMatchObject({ status: "used" });
    });

    it("does not consume again on replay", async () => {
      const leases = new InMemoryReplyTokenLease();
      await leases.acquire(leaseInput);
      await leases.consume(leaseInput.eventKey, leaseInput.replyToken, 2_000);
      expect(await leases.acquire({ ...leaseInput, now: 2_001, isRedelivery: true })).toMatchObject({ status: "used" });
    });

    it("does not assume a redelivered token is usable without tracked state", async () => {
      const leases = new InMemoryReplyTokenLease();
      expect(await leases.acquire({ ...leaseInput, isRedelivery: true })).toMatchObject({ status: "redelivery_unverified" });
    });

    it("degrades safely when reply token is missing", async () => {
      expect(await new InMemoryReplyTokenLease().acquire({ ...leaseInput, replyToken: null })).toMatchObject({ status: "no_reply" });
    });
  });

  describe("fake transport and safe evidence", () => {
    const request = Object.freeze({ operation: "reply" as const, eventKey: "line:account:event-1", replyToken: "ephemeral-token", messages: Object.freeze([{ type: "text" as const, text: "safe local result" }]) });

    it("records bounded metadata only and performs no network call", async () => {
      const transport = new FakeLineTransport("success");
      expect(await transport.dispatch(request, { fakeTransportEnabled: true, killSwitch: false })).toMatchObject({ status: "simulated_succeeded", networkUsed: false });
      expect(transport.records()).toEqual([{ operation: "reply", eventKey: request.eventKey, messageCount: 1, totalTextUnits: 17, networkUsed: false }]);
      expect(JSON.stringify(transport.records())).not.toContain(request.replyToken);
      expect(transport.networkAllowed).toBe(false);
    });

    it("kill switch rejects fake dispatch", async () => {
      expect(await new FakeLineTransport("success").dispatch(request, { fakeTransportEnabled: true, killSwitch: true })).toMatchObject({ status: "kill_switch", reasonCode: "LINE_KILL_SWITCH_ACTIVE" });
    });

    it("disabled adapter rejects fake dispatch", async () => {
      expect(await new FakeLineTransport("success").dispatch(request, { fakeTransportEnabled: false, killSwitch: false })).toMatchObject({ status: "disabled", reasonCode: "LINE_REAL_ADAPTER_DISABLED" });
    });

    it("classifies transient provider failure without blind reply retry", async () => {
      expect(await new FakeLineTransport("transient_failure").dispatch(request, { fakeTransportEnabled: true, killSwitch: false })).toMatchObject({ status: "transient_failure", retrySafe: false, retryAfterClass: "standard" });
    });

    it("classifies permanent provider failure as terminal", async () => {
      expect(await new FakeLineTransport("permanent_failure").dispatch(request, { fakeTransportEnabled: true, killSwitch: false })).toMatchObject({ status: "terminal_failure", retrySafe: false, retryAfterClass: "none" });
    });

    it("maps rate limiting to a bounded retry category", async () => {
      expect(await new FakeLineTransport("rate_limited").dispatch(request, { fakeTransportEnabled: true, killSwitch: false })).toMatchObject({ status: "rate_limited", retryAfterClass: "short" });
    });

    it("keeps verification evidence free of payload, UID, token, signature, and secret", async () => {
      const harness = new LineIsolatedVerificationHarness(isolatedLineFixtureKey);
      const result = await harness.verify({ channelAccountKey: "account", ...(await signedEvent(isolatedLineFixtures.text)) });
      const evidence = JSON.stringify(result.events[0]?.evidence);
      expect(evidence).not.toMatch(/hello LINE|U000000|reply-token|x-line-signature|fixture-key|secret|authorization/i);
    });
  });

  describe("production isolation", () => {
    it("keeps the real adapter disabled and Workbench authoritative", () => {
      expect(lineIsolatedVerificationStatus).toMatchObject({ realAdapter: "disabled", providerTransport: "fake_only", authority: "workbench_only", productionUse: "not_allowed" });
    });

    it("does not import isolated verification from the production composition", () => {
      expect(readFileSync("src/index.ts", "utf8")).not.toMatch(/line-adapter-isolated-verification|LineIsolatedVerificationHarness/);
    });

    it("does not add a local or public route", () => {
      const entries = readFileSync("src/index.ts", "utf8") + readFileSync("src/local-demo/worker.ts", "utf8");
      expect(entries).not.toMatch(/line-adapter-isolated-verification|local\/line-verification|webhook\/line/);
    });

    it("adds no LINE SDK or provider dependency", () => {
      expect(readFileSync("package.json", "utf8")).not.toMatch(/@line\/bot-sdk|line-bot-sdk|line-messaging-api/);
    });

    it("does not modify Wrangler composition with LINE credentials or bindings", () => {
      const config = readdirSync(".").filter((file) => /^wrangler.*\.jsonc$/.test(file)).map((file) => readFileSync(file, "utf8")).join("\n");
      expect(config).not.toMatch(/LINE_CHANNEL|line-adapter-isolated|api\.line\.me/);
    });

    it("adds no formal migration", () => {
      const migrationNames = readdirSync("migrations").join("\n");
      expect(migrationNames).not.toMatch(/line.*isolated|0011/i);
    });

    it("contains no outbound network or credential-loading code", () => {
      const source = readdirSync("src/line-adapter-isolated-verification").map((file) => readFileSync(`src/line-adapter-isolated-verification/${file}`, "utf8")).join("\n");
      expect(source).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest|WebSocket|api\.line\.me|process\.env|import\.meta\.env/);
    });
  });
});
