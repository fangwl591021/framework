import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertLineTimestamp,
  buildLineSafeEvidence,
  decideLineRateLimit,
  decideLineRetry,
  deterministicLineSignatureVector,
  evaluateLineReadiness,
  evaluateReplyToken,
  lineCapability,
  lineDisabledAdapterMetadata,
  lineEnablementApprovalWorkflow,
  lineLocalVerificationScenarios,
  lineReplyTokenPolicy,
  lineReplayKey,
  lineWebhookEventTypes,
  validateLineCredentialReferences,
  validateLineWebhookEvent,
  verifyDeterministicLineSignatureVector,
  verifyLineReadinessSignature,
} from "../src/line-adapter-readiness";

const encoder = new TextEncoder();
const candidate = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  eventType: "message.text",
  webhookEventId: "01READINESSVECTOR",
  timestamp: 1_000_000,
  sourceType: "user",
  isRedelivery: false,
  textLength: 10,
  replyTokenPresent: true,
  ...overrides,
});

const approvals = Object.freeze({ architecture: true, security: true, privacy: true, operations: true, cost: true, execution: true });

describe("LINE Adapter Enablement Readiness", () => {
  describe("webhook contract", () => {
    it.each(lineWebhookEventTypes)("accepts allowlisted event %s", (eventType) => {
      expect(validateLineWebhookEvent(candidate({ eventType })).eventType).toBe(eventType);
    });

    it("rejects an unknown event", () => {
      expect(() => validateLineWebhookEvent(candidate({ eventType: "arbitrary.event" }))).toThrow("LINE_EVENT_UNSUPPORTED");
    });

    it("rejects unbounded text metadata", () => {
      expect(() => validateLineWebhookEvent(candidate({ textLength: 5001 }))).toThrow("LINE_EVENT_INVALID");
    });

    it("rejects arbitrary payload fields", () => {
      expect(() => validateLineWebhookEvent(candidate({ payload: { raw: true } }))).toThrow("LINE_EVENT_INVALID");
    });

    it("produces bounded metadata without UID or payload", () => {
      const result = validateLineWebhookEvent(candidate());
      expect(Object.keys(result)).toEqual(["contractVersion", "eventType", "webhookEventId", "timestamp", "sourceType", "isRedelivery", "textLength", "replyTokenPresent"]);
      expect(JSON.stringify(result)).not.toMatch(/userId|payload|replyToken\"/i);
    });
  });

  describe("signature and replay", () => {
    it("passes the deterministic HMAC-SHA256 vector", async () => {
      await expect(verifyDeterministicLineSignatureVector()).resolves.toBeUndefined();
    });

    it("verifies the exact original raw bytes", async () => {
      const key = encoder.encode(deterministicLineSignatureVector.fixtureKeyUtf8);
      const changed = encoder.encode(`${deterministicLineSignatureVector.rawBodyUtf8} `);
      await expect(verifyLineReadinessSignature(changed, deterministicLineSignatureVector.expectedSignatureBase64, key)).rejects.toThrow("LINE_SIGNATURE_INVALID");
    });

    it("fails closed when signature is missing", async () => {
      await expect(verifyLineReadinessSignature(encoder.encode("{}"), null, encoder.encode("readiness-fixture-key-v1"))).rejects.toThrow("LINE_SIGNATURE_MISSING");
    });

    it("fails closed when signature is invalid", async () => {
      await expect(verifyLineReadinessSignature(encoder.encode("{}"), "A".repeat(43) + "=", encoder.encode("readiness-fixture-key-v1"))).rejects.toThrow("LINE_SIGNATURE_INVALID");
    });

    it("creates a stable account-scoped replay key", () => {
      expect(lineReplayKey("line-account-a", "event_01")).toBe(lineReplayKey("line-account-a", "event_01"));
      expect(lineReplayKey("line-account-a", "event_01")).not.toBe(lineReplayKey("line-account-b", "event_01"));
    });

    it("rejects stale timestamps", () => {
      expect(() => assertLineTimestamp(699_999, 1_000_000)).toThrow("LINE_EVENT_STALE");
    });

    it("rejects excessive future skew", () => {
      expect(() => assertLineTimestamp(1_030_001, 1_000_000)).toThrow("LINE_EVENT_FROM_FUTURE");
    });
  });

  describe("reply token lifecycle", () => {
    it("marks the reply token as transient and never persisted", () => {
      expect(lineReplyTokenPolicy).toMatchObject({ singleUse: true, persistence: "forbidden" });
    });

    it("accepts only an unused token inside the local policy window", () => {
      expect(evaluateReplyToken({ eventTimestamp: 1_000, receivedAt: 1_010, now: 2_000, consumed: false, redelivery: false })).toBe("available");
    });

    it("rejects a consumed token", () => {
      expect(() => evaluateReplyToken({ eventTimestamp: 1_000, receivedAt: 1_010, now: 2_000, consumed: true, redelivery: false })).toThrow("LINE_REPLY_TOKEN_CONSUMED");
    });

    it("rejects an expired token", () => {
      expect(() => evaluateReplyToken({ eventTimestamp: 1_000, receivedAt: 1_010, now: 61_010, consumed: false, redelivery: false })).toThrow("LINE_REPLY_TOKEN_EXPIRED");
    });
  });

  describe("capability, rate, retry, and outage policy", () => {
    it("maps supported text without execution authority", () => {
      expect(lineCapability("text")).toMatchObject({ plannedOutput: "text", disposition: "supported", executable: false });
    });

    it("degrades confirmation to a planned Flex representation", () => {
      expect(lineCapability("confirmation")).toMatchObject({ plannedOutput: "flex", disposition: "degraded", executable: false });
    });

    it("degrades unknown capability to no reply", () => {
      expect(lineCapability("unsupported")).toMatchObject({ plannedOutput: "no_reply", disposition: "rejected", executable: false });
    });

    it("makes deterministic rate decisions", () => {
      expect(decideLineRateLimit({ killSwitch: false, providerAvailable: true, remainingCapacity: 1, inFlight: 0 })).toEqual(decideLineRateLimit({ killSwitch: false, providerAvailable: true, remainingCapacity: 1, inFlight: 0 }));
      expect(decideLineRateLimit({ killSwitch: false, providerAvailable: true, remainingCapacity: 0, inFlight: 0 }).reasonCode).toBe("LINE_RATE_LIMITED");
    });

    it("treats provider outage as unavailable without network", () => {
      expect(decideLineRateLimit({ killSwitch: false, providerAvailable: false, remainingCapacity: 10, inFlight: 0 })).toMatchObject({ eligibleForSimulation: false, reasonCode: "LINE_PROVIDER_UNAVAILABLE", networkExecuted: false });
    });

    it("never retries reply-token mutation blindly", () => {
      expect(decideLineRetry({ operation: "reply", failure: "timeout", mutationCommitted: false, providerRetryKeyAvailable: false })).toMatchObject({ action: "do_not_retry", maximumAttempts: 0 });
    });

    it("requires a provider retry key for a single simulated retry", () => {
      expect(decideLineRetry({ operation: "push", failure: "provider_5xx", mutationCommitted: false, providerRetryKeyAvailable: true })).toMatchObject({ action: "retry_with_provider_key", maximumAttempts: 1, networkExecuted: false });
    });

    it("routes unknown result to reconciliation instead of replay", () => {
      expect(decideLineRetry({ operation: "push", failure: "unknown_result", mutationCommitted: false, providerRetryKeyAvailable: true }).action).toBe("manual_reconciliation");
    });

    it("forces disabled state through kill switch", () => {
      expect(decideLineRateLimit({ killSwitch: true, providerAvailable: true, remainingCapacity: 10, inFlight: 0 })).toMatchObject({ eligibleForSimulation: false, reasonCode: "LINE_KILL_SWITCH_ACTIVE" });
    });
  });

  describe("credentials, evidence, and readiness gates", () => {
    it("accepts the not-provisioned credential reference model", () => {
      expect(validateLineCredentialReferences({ provider: "line", state: "not_provisioned", signatureKeyReference: null, deliveryCredentialReference: null, containsCredentialValue: false }).state).toBe("not_provisioned");
    });

    it("rejects credential-like values in reference fields", () => {
      expect(() => validateLineCredentialReferences({ provider: "line", state: "planned_reference", signatureKeyReference: "value:unsafe", deliveryCredentialReference: null, containsCredentialValue: false })).toThrow("LINE_CREDENTIAL_REFERENCE_INVALID");
    });

    it("builds bounded evidence without sensitive fields", () => {
      const evidence = buildLineSafeEvidence({ status: "simulated", reasonCode: "LINE_VECTOR_VALID", eventType: "message.text", replayKeyDigestPrefix: "0123abcd", latencyBucket: "fast", supportCode: "LN-ABCDEF12" });
      expect(evidence).toMatchObject({ adapterKey: "disabled_line_adapter", networkUsed: false });
      expect(JSON.stringify(evidence)).not.toMatch(/payload|uid|token|signature|credential|authorization/i);
    });

    it("remains NO-GO when any required approval is absent", () => {
      const result = evaluateLineReadiness({ approvals: { ...approvals, privacy: false }, signatureVectorsPassed: true, replayTestsPassed: true, outageDrillPassed: true, rollbackDrillPassed: true, credentialReferencesProvisioned: false, realAdapterEnabled: false, killSwitchForcedDisabled: true });
      expect(result).toMatchObject({ decision: "NO-GO", maximumState: "readiness_candidate" });
      expect(result.blockers).toContain("APPROVAL_PRIVACY_MISSING");
    });

    it("cannot exceed NO-GO even if all review booleans are true", () => {
      const result = evaluateLineReadiness({ approvals, signatureVectorsPassed: true, replayTestsPassed: true, outageDrillPassed: true, rollbackDrillPassed: true, credentialReferencesProvisioned: false, realAdapterEnabled: false, killSwitchForcedDisabled: true });
      expect(result.decision).toBe("NO-GO");
      expect(result.blockers).toEqual(expect.arrayContaining(["CREDENTIALS_NOT_PROVISIONED", "REAL_ADAPTER_DISABLED", "KILL_SWITCH_FORCED_DISABLED"]));
    });

    it("keeps the adapter disabled and Workbench authoritative", () => {
      expect(lineDisabledAdapterMetadata).toMatchObject({ enabled: false, approvedForProduction: false, outboundNetworkAllowed: false, authority: "workbench_only" });
    });

    it("keeps enablement approval ordered and blocked before provisioning", () => {
      expect(lineEnablementApprovalWorkflow.map((step) => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(lineEnablementApprovalWorkflow.at(-1)?.status).toBe("blocked");
    });

    it("exposes only fixed local verification scenarios", () => {
      expect(lineLocalVerificationScenarios).toContain("valid_signature_vector");
      expect(lineLocalVerificationScenarios).toContain("kill_switch");
      expect(Object.isFrozen(lineLocalVerificationScenarios)).toBe(true);
    });
  });

  describe("production isolation", () => {
    it("does not import readiness code from the production entry", () => {
      expect(readFileSync("src/index.ts", "utf8")).not.toMatch(/line-adapter-readiness|LINE Adapter Enablement Readiness/);
    });

    it("adds no LINE SDK dependency", () => {
      const manifest = readFileSync("package.json", "utf8");
      expect(manifest).not.toMatch(/line-bot-sdk|@line\/bot-sdk|messaging-api-line/);
    });

    it("adds no readiness route or provider URL", () => {
      const production = readFileSync("src/index.ts", "utf8");
      const localWorker = readFileSync("src/local-demo/worker.ts", "utf8");
      expect(production + localWorker).not.toMatch(/line-adapter-readiness|local\/line-readiness|api\.line\.me/);
    });

    it("contains no network call in readiness implementation", () => {
      const files = ["models.ts", "contracts.ts", "signature.ts", "readiness.ts", "index.ts"];
      const source = files.map((file) => readFileSync(`src/line-adapter-readiness/${file}`, "utf8")).join("\n");
      expect(source).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest|WebSocket/);
    });
  });
});
