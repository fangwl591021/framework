import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canonicalLineEgressAllowlistContract,
  canonicalLineSandboxTransportContract,
  canonicalLineWebhookIngressContract,
  createLineProviderSandboxPlanSnapshot,
  createPlannedLineCredentialReference,
  decideLineProviderSandboxIntegrationPlan,
  evaluateLineSandboxEntryExit,
  evaluateLineSandboxGates,
  evaluateLineSandboxTestMatrix,
  lineProviderSandboxPlanStatus,
  lineSandboxGateKeys,
  lineSandboxTestCaseKeys,
  localLineSandboxTestCases,
  localLineSandboxTestRecord,
  mapLineProviderFailure,
  pendingLineSandboxGate,
  pendingProviderSandboxTestRecord,
  providerFailureClasses,
  realWorldLineSandboxTestCases,
  validateLineCredentialReference,
  validateLineEgressAllowlistContract,
  validateLineProviderSandboxPlanSnapshot,
  validateLineSandboxTransportContract,
  validateLineWebhookIngressContract,
  type LineCredentialReferenceContract,
  type LineEgressAllowlistContract,
  type LineProviderSandboxPlanSnapshot,
  type LineSandboxGateEvidence,
  type LineSandboxTestRecord,
  type LineSandboxTransportContract,
  type LineWebhookIngressContract,
} from "../src/line-provider-sandbox-integration-plan";

const NOW = 100_000;

function snapshot(): LineProviderSandboxPlanSnapshot {
  return createLineProviderSandboxPlanSnapshot({ snapshotRef: "snapshot.line.sandbox.plan.v1", policyVersion: 1, createdAtBucket: NOW, sourceConsolidationRef: "snapshot.line.consolidation.v1", source: "trusted_repository" });
}

function localTests(): readonly LineSandboxTestRecord[] {
  return Object.freeze(localLineSandboxTestCases.map((item) => localLineSandboxTestRecord(item, NOW)));
}

function pendingTests(): readonly LineSandboxTestRecord[] {
  return Object.freeze([...localTests(), ...realWorldLineSandboxTestCases.map(pendingProviderSandboxTestRecord)]);
}

function completeTests(): readonly LineSandboxTestRecord[] {
  return Object.freeze([...localTests(), ...realWorldLineSandboxTestCases.map((testCase) => Object.freeze({ testCase, evidenceClass: "real_world_prerequisite" as const, status: "passed" as const, evidenceRef: `test.synthetic.${testCase}.v1`, verifiedAtBucket: NOW, maximumAgeBuckets: 24 * 30, source: "trusted_provider_sandbox" as const }))]);
}

function pendingGates(): readonly LineSandboxGateEvidence[] {
  return Object.freeze(lineSandboxGateKeys.map(pendingLineSandboxGate));
}

function completeGates(): readonly LineSandboxGateEvidence[] {
  return Object.freeze(lineSandboxGateKeys.map((gate) => Object.freeze({ gate, status: "approved" as const, evidenceRef: `gate.synthetic.${gate}.v1`, approvedAtBucket: NOW, maximumAgeBuckets: 24 * 30, approverRole: `${gate}_owner`, source: "trusted_governance" as const })));
}

function fullDecisionInput(testRecords = pendingTests(), gateEvidence = pendingGates()) {
  return { snapshot: snapshot(), transport: canonicalLineSandboxTransportContract, credentialReferences: [createPlannedLineCredentialReference("channel_secret", "secret-ref:line_channel_secret", 1), createPlannedLineCredentialReference("channel_access_token", "secret-ref:line_channel_token", 1)], webhook: canonicalLineWebhookIngressContract, egress: canonicalLineEgressAllowlistContract, testRecords, gateEvidence, nowBucket: NOW } as const;
}

describe("LINE Provider Sandbox Integration Plan", () => {
  describe("immutable snapshot and status", () => {
    it("creates a deeply immutable canonical snapshot", () => {
      const value = snapshot();
      expect(Object.isFrozen(value)).toBe(true);
      expect(Object.isFrozen(value.status)).toBe(true);
      expect(value.status).toBe(lineProviderSandboxPlanStatus);
      expect(validateLineProviderSandboxPlanSnapshot(value)).toBe(value);
    });

    it("preserves exact lifecycle and NO-GO status", () => {
      expect(lineProviderSandboxPlanStatus).toEqual({ lifecycle: "provider_sandbox_integration_plan_candidate", realAdapter: "disabled", providerExecution: "not_authorized", canaryExecution: "not_authorized", providerSandboxEntry: "not_authorized", providerSandboxConnectivity: "not_implemented", providerTransport: "fake_only", credentials: "not_provisioned", credentialReferences: "contract_only", publicWebhook: "not_created", webhookIngress: "contract_only", egress: "allowlist_contract_only", lineApiAccess: "prohibited", remoteD1: "not_used", deployment: "not_performed", productionUse: "not_allowed", authority: "workbench_only", decision: "NO-GO" });
    });

    it("rejects malformed references", () => {
      expect(() => createLineProviderSandboxPlanSnapshot({ snapshotRef: "bad ref", policyVersion: 1, createdAtBucket: NOW, sourceConsolidationRef: "snapshot.ok", source: "trusted_repository" })).toThrowError("PLAN_SNAPSHOT_INVALID");
    });

    it("rejects unknown input fields", () => {
      expect(() => createLineProviderSandboxPlanSnapshot({ snapshotRef: "snapshot.ok", policyVersion: 1, createdAtBucket: NOW, sourceConsolidationRef: "snapshot.source", source: "trusted_repository", tenantId: "client" } as never)).toThrowError("PLAN_SNAPSHOT_INVALID");
    });

    it("rejects untrusted snapshots", () => {
      expect(() => createLineProviderSandboxPlanSnapshot({ snapshotRef: "snapshot.ok", policyVersion: 1, createdAtBucket: NOW, sourceConsolidationRef: "snapshot.source", source: "client" } as never)).toThrowError("PLAN_SNAPSHOT_UNTRUSTED");
    });

    it("rejects mutable snapshots", () => {
      expect(() => validateLineProviderSandboxPlanSnapshot({ ...snapshot() })).toThrowError("PLAN_SNAPSHOT_INVALID");
    });
  });

  describe("transport contract", () => {
    it("accepts only the canonical fake transport plan", () => {
      expect(validateLineSandboxTransportContract(canonicalLineSandboxTransportContract)).toMatchObject({ executionMode: "fake_only", networkEnabled: false, runtimeComposed: false, providerExecutionAuthorized: false });
    });

    it.each([
      ["boundedRequestBytes", 0], ["boundedResponseBytes", 262_145], ["source", "client"],
    ])("rejects invalid %s", (key, value) => {
      expect(() => validateLineSandboxTransportContract({ ...canonicalLineSandboxTransportContract, [key]: value } as LineSandboxTransportContract)).toThrowError("TRANSPORT_CONTRACT_INVALID");
    });

    it.each([["executionMode", "external"], ["networkEnabled", true], ["runtimeComposed", true], ["providerExecutionAuthorized", true]])("fails closed on non-fake transport %s", (key, value) => {
      expect(() => validateLineSandboxTransportContract({ ...canonicalLineSandboxTransportContract, [key]: value } as LineSandboxTransportContract)).toThrowError("TRANSPORT_NOT_FAKE_ONLY");
    });

    it("rejects unknown transport fields", () => {
      expect(() => validateLineSandboxTransportContract({ ...canonicalLineSandboxTransportContract, endpoint: "forbidden" } as never)).toThrowError("TRANSPORT_CONTRACT_INVALID");
    });
  });

  describe("credential reference contract", () => {
    it.each(["channel_secret", "channel_access_token"] as const)("creates planned %s reference without value", (credentialClass) => {
      const value = createPlannedLineCredentialReference(credentialClass, `secret-ref:${credentialClass}`, 1);
      expect(value).toMatchObject({ lifecycle: "planned", containsSecretValue: false, environment: "provider_sandbox" });
      expect(Object.isFrozen(value)).toBe(true);
    });

    it("rejects an invalid credential reference", () => {
      expect(() => createPlannedLineCredentialReference("channel_secret", "plain-name", 1)).toThrowError("CREDENTIAL_REFERENCE_INVALID");
    });

    it("rejects a secret value field explicitly", () => {
      const reference = { ...createPlannedLineCredentialReference("channel_secret", "secret-ref:channel_secret", 1), secret: "not-accepted" };
      expect(() => validateLineCredentialReference(reference as never)).toThrowError("CREDENTIAL_VALUE_PROHIBITED");
    });

    it.each([["lifecycle", "active"], ["containsSecretValue", true], ["environment", "production"], ["version", 0]])("rejects invalid %s", (key, value) => {
      expect(() => validateLineCredentialReference({ ...createPlannedLineCredentialReference("channel_secret", "secret-ref:channel_secret", 1), [key]: value } as LineCredentialReferenceContract)).toThrowError("CREDENTIAL_REFERENCE_INVALID");
    });

    it("rejects missing credential references", () => {
      expect(() => decideLineProviderSandboxIntegrationPlan({ ...fullDecisionInput(), credentialReferences: [] })).toThrowError("CREDENTIAL_REFERENCE_INVALID");
    });

    it("rejects duplicate credential classes", () => {
      const one = createPlannedLineCredentialReference("channel_secret", "secret-ref:channel_secret_one", 1);
      const two = createPlannedLineCredentialReference("channel_secret", "secret-ref:channel_secret_two", 2);
      expect(() => decideLineProviderSandboxIntegrationPlan({ ...fullDecisionInput(), credentialReferences: [one, two] })).toThrowError("CREDENTIAL_REFERENCE_INVALID");
    });
  });

  describe("webhook ingress contract", () => {
    it("accepts the bounded contract-only definition", () => {
      expect(validateLineWebhookIngressContract(canonicalLineWebhookIngressContract)).toMatchObject({ method: "POST", publicRouteCreated: false, rawBytesRequired: true, signatureRequired: true, replayProtectionRequired: true });
    });

    it.each([
      ["method", "GET"], ["ingressMode", "runtime"], ["rawBytesRequired", false],
      ["signatureRequired", false], ["replayProtectionRequired", false], ["maximumBodyBytes", 0], ["maximumEvents", 101], ["source", "client"],
    ])("rejects webhook %s", (key, value) => {
      expect(() => validateLineWebhookIngressContract({ ...canonicalLineWebhookIngressContract, [key]: value } as LineWebhookIngressContract)).toThrowError("WEBHOOK_CONTRACT_INVALID");
    });

    it("rejects public webhook creation with an exact reason", () => {
      expect(() => validateLineWebhookIngressContract({ ...canonicalLineWebhookIngressContract, publicRouteCreated: true } as never)).toThrowError("PUBLIC_WEBHOOK_PROHIBITED");
    });

    it("rejects non-exact content types", () => {
      expect(() => validateLineWebhookIngressContract({ ...canonicalLineWebhookIngressContract, acceptedContentTypes: ["application/json", "text/plain"] } as never)).toThrowError("WEBHOOK_CONTRACT_INVALID");
    });

    it("rejects a route field", () => {
      expect(() => validateLineWebhookIngressContract({ ...canonicalLineWebhookIngressContract, route: "/webhook" } as never)).toThrowError("WEBHOOK_CONTRACT_INVALID");
    });
  });

  describe("egress allowlist contract", () => {
    it("accepts exact symbolic host and sorted path references", () => {
      const result = validateLineEgressAllowlistContract(canonicalLineEgressAllowlistContract);
      expect(result).toMatchObject({ mode: "allowlist_contract_only", networkEnabled: false, wildcardAllowed: false, redirectsAllowed: false });
      expect(result.pathReferences).toEqual([...result.pathReferences].sort());
    });

    it.each([
      ["mode", "active"], ["hostReference", "custom_host"], ["protocol", "http"], ["port", 80],
      ["methods", ["GET"]], ["wildcardAllowed", true], ["redirectsAllowed", true], ["source", "client"],
    ])("rejects egress %s", (key, value) => {
      expect(() => validateLineEgressAllowlistContract({ ...canonicalLineEgressAllowlistContract, [key]: value } as LineEgressAllowlistContract)).toThrowError("EGRESS_CONTRACT_INVALID");
    });

    it("rejects enabled egress with an exact reason", () => {
      expect(() => validateLineEgressAllowlistContract({ ...canonicalLineEgressAllowlistContract, networkEnabled: true } as never)).toThrowError("EGRESS_NETWORK_PROHIBITED");
    });

    it("rejects path URLs and wildcards", () => {
      expect(() => validateLineEgressAllowlistContract({ ...canonicalLineEgressAllowlistContract, pathReferences: ["https://provider.invalid/*"] } as never)).toThrowError("EGRESS_CONTRACT_INVALID");
    });

    it("rejects duplicate path references", () => {
      expect(() => validateLineEgressAllowlistContract({ ...canonicalLineEgressAllowlistContract, pathReferences: ["line_path:reply_message", "line_path:reply_message"] } as never)).toThrowError("EGRESS_CONTRACT_INVALID");
    });
  });

  describe("provider error mapping", () => {
    it.each([
      ["timeout", "PROVIDER_TIMEOUT", "bounded_after_delay"], ["rate_limited", "PROVIDER_RATE_LIMITED", "bounded_after_delay"],
      ["unavailable", "PROVIDER_UNAVAILABLE", "bounded_after_delay"], ["invalid_request", "PROVIDER_REQUEST_REJECTED", "never"],
      ["authentication_failed", "PROVIDER_AUTHENTICATION_FAILED", "operator_review"], ["permission_denied", "PROVIDER_PERMISSION_DENIED", "operator_review"],
      ["invalid_response", "PROVIDER_RESPONSE_INVALID", "never"], ["unknown", "PROVIDER_FAILURE_UNKNOWN", "operator_review"],
    ] as const)("maps %s to stable reason", (failure, reasonCode, retry) => {
      expect(mapLineProviderFailure(failure)).toMatchObject({ failureClass: failure, reasonCode, retry });
    });

    it("covers each allowlisted failure exactly once", () => {
      expect(providerFailureClasses.map((item) => mapLineProviderFailure(item).failureClass)).toEqual(providerFailureClasses);
    });

    it("rejects unknown provider failure", () => {
      expect(() => mapLineProviderFailure("sdk_error" as never)).toThrowError("TRANSPORT_CONTRACT_INVALID");
    });
  });

  describe("test matrix and freshness", () => {
    it("separates completed local controls from missing provider evidence", () => {
      expect(evaluateLineSandboxTestMatrix(pendingTests(), NOW)).toMatchObject({ localControlsComplete: true, realWorldPrerequisitesComplete: false, stale: [], failed: [], reasonCodes: ["TEST_MATRIX_INCOMPLETE"] });
    });

    it("fails closed on an incomplete matrix", () => {
      const result = evaluateLineSandboxTestMatrix(localTests().slice(1), NOW);
      expect(result.missing).toContain("signature_valid");
      expect(result.reasonCodes).toContain("TEST_MATRIX_INCOMPLETE");
    });

    it("classifies stale evidence", () => {
      const records = localTests().map((item) => item.testCase === "signature_valid" ? { ...item, verifiedAtBucket: NOW - item.maximumAgeBuckets - 1 } : item);
      const result = evaluateLineSandboxTestMatrix(records, NOW);
      expect(result.stale).toEqual(["signature_valid"]);
      expect(result.reasonCodes).toContain("TEST_EVIDENCE_STALE");
    });

    it("classifies failed evidence", () => {
      const records = localTests().map((item) => item.testCase === "signature_invalid" ? { ...item, status: "failed" as const } : item);
      expect(evaluateLineSandboxTestMatrix(records, NOW)).toMatchObject({ localControlsComplete: false, failed: ["signature_invalid"] });
    });

    it("rejects duplicate test evidence", () => {
      const first = localTests()[0]!;
      expect(() => evaluateLineSandboxTestMatrix([...localTests(), first], NOW)).toThrowError("TEST_MATRIX_INVALID");
    });

    it("accepts synthetic full evidence without granting authority", () => {
      expect(evaluateLineSandboxTestMatrix(completeTests(), NOW)).toMatchObject({ localControlsComplete: true, realWorldPrerequisitesComplete: true, missing: [], stale: [], failed: [] });
    });
  });

  describe("security, privacy, and operations gates", () => {
    it("reports every missing gate with exact stable reasons", () => {
      const result = evaluateLineSandboxGates(pendingGates(), NOW);
      expect(result.complete).toBe(false);
      expect(result.reasonCodes).toEqual(["ARCHITECTURE_GATE_MISSING", "COST_GATE_MISSING", "EXECUTION_GATE_MISSING", "OPERATIONS_GATE_MISSING", "PRIVACY_GATE_MISSING", "SECURITY_GATE_MISSING"]);
    });

    it("reports stale security evidence", () => {
      const records = completeGates().map((item) => item.gate === "security" ? { ...item, approvedAtBucket: NOW - item.maximumAgeBuckets - 1 } : item);
      expect(evaluateLineSandboxGates(records, NOW)).toMatchObject({ complete: false, stale: ["security"], reasonCodes: ["GATE_EVIDENCE_STALE", "SECURITY_GATE_MISSING"] });
    });

    it("rejects duplicate gate evidence", () => {
      expect(() => evaluateLineSandboxGates([...pendingGates(), pendingGates()[0]!], NOW)).toThrowError("GATE_EVIDENCE_INVALID");
    });

    it("accepts complete synthetic gate metadata without authorizing entry", () => {
      expect(evaluateLineSandboxGates(completeGates(), NOW)).toMatchObject({ complete: true, missing: [], stale: [], reasonCodes: [] });
    });
  });

  describe("entry, exit, and decision", () => {
    it("fails closed when input is absent", () => {
      expect(evaluateLineSandboxEntryExit()).toMatchObject({ entryDecision: "NO-GO", exitDecision: "NOT_ELIGIBLE", providerSandboxEntryAuthorized: false, productionEntryPossible: false });
      expect(evaluateLineSandboxEntryExit().reasonCodes).toContain("PLAN_INPUT_MISSING");
    });

    it("keeps entry NO-GO with local controls complete", () => {
      const result = decideLineProviderSandboxIntegrationPlan(fullDecisionInput());
      expect(result).toMatchObject({ decision: "NO-GO", localPlanComplete: true, realWorldPrerequisitesComplete: false, providerSandboxEntryAuthorized: false, providerExecutionAuthorized: false, canaryExecutionAuthorized: false, productionEntryPossible: false, productionAuthority: false, networkExecuted: false });
      expect(result.reasonCodes).toContain("REAL_WORLD_EVIDENCE_INCOMPLETE");
    });

    it("remains NO-GO even with synthetic complete evidence and gates", () => {
      const result = decideLineProviderSandboxIntegrationPlan(fullDecisionInput(completeTests(), completeGates()));
      expect(result).toMatchObject({ decision: "NO-GO", entryDecision: "NO-GO", exitDecision: "NOT_ELIGIBLE", localPlanComplete: true, realWorldPrerequisitesComplete: true, providerSandboxEntryAuthorized: false, providerExecutionAuthorized: false, canaryExecutionAuthorized: false, productionEntryPossible: false });
      expect(result.reasonCodes).toEqual(expect.arrayContaining(["PROVIDER_SANDBOX_ENTRY_NOT_AUTHORIZED", "PRODUCTION_USE_NOT_ALLOWED", "LINE_API_ACCESS_PROHIBITED"]));
    });

    it("returns deterministic output and ordering", () => {
      const first = decideLineProviderSandboxIntegrationPlan(fullDecisionInput());
      const second = decideLineProviderSandboxIntegrationPlan(fullDecisionInput());
      expect(first).toEqual(second);
      expect(first.reasonCodes).toEqual([...first.reasonCodes].sort());
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.reasonCodes)).toBe(true);
    });

    it("preserves exact permanent blockers", () => {
      const result = decideLineProviderSandboxIntegrationPlan(fullDecisionInput(completeTests(), completeGates()));
      expect(result.reasonCodes).toEqual(expect.arrayContaining(["REAL_LINE_ADAPTER_DISABLED", "PROVIDER_EXECUTION_NOT_AUTHORIZED", "CANARY_EXECUTION_NOT_AUTHORIZED", "PROVIDER_SANDBOX_CONNECTIVITY_NOT_IMPLEMENTED", "PROVIDER_TRANSPORT_FAKE_ONLY", "CREDENTIALS_NOT_PROVISIONED", "PUBLIC_WEBHOOK_NOT_CREATED", "REMOTE_D1_NOT_USED", "DEPLOYMENT_NOT_PERFORMED"]));
    });
  });

  describe("hard production isolation", () => {
    it("is absent from both runtime composition entries", () => {
      const entries = readFileSync("src/index.ts", "utf8") + readFileSync("src/local-demo/worker.ts", "utf8");
      expect(entries).not.toMatch(/line-provider-sandbox-integration-plan|LineProviderSandboxPlan/);
    });

    it("contains no SDK, network client, binding, scheduler, or database code", () => {
      const source = readdirSync("src/line-provider-sandbox-integration-plan").map((file) => readFileSync(`src/line-provider-sandbox-integration-plan/${file}`, "utf8")).join("\n");
      expect(source).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest|WebSocket|@line\/|process\.env|import\.meta\.env|D1Database|ScheduledController|\bQueue\b|\bCron\b/);
      expect(readFileSync("package.json", "utf8")).not.toMatch(/@line\/bot-sdk|line-bot-sdk/);
    });

    it("adds no migration or disabled adapter change", () => {
      const source = readdirSync("src/line-provider-sandbox-integration-plan").map((file) => readFileSync(`src/line-provider-sandbox-integration-plan/${file}`, "utf8")).join("\n");
      expect(source).not.toContain("disabled_line_adapter");
      expect(readdirSync("migrations").join("\n")).not.toMatch(/sandbox.*integration.*plan|0011/i);
    });
  });
});
