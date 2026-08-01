import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCanaryAuditEvidence,
  canaryApprovalKinds,
  canaryAutomaticPausePolicy,
  canaryEgressPolicy,
  canaryFreshnessKinds,
  canaryKillSwitchDecision,
  createCanaryApprovalSnapshot,
  defaultCanaryBudgetPolicy,
  defaultCanaryCohortPolicy,
  evaluateCanaryApprovalSnapshot,
  evaluateCanaryAutomaticPause,
  evaluateCanaryBudget,
  evaluateCanaryCohort,
  evaluateCanaryCredentialBindings,
  evaluateCanaryEgressEnforcement,
  evaluateCanaryEvidenceFreshness,
  evaluateCanaryExecutionPermit,
  evaluateLineCanaryReadiness,
  lineCanaryEnablementReadinessStatus,
  rollbackCanaryCredentialBinding,
  runCanaryCredentialRevocationDrill,
  runCanaryProviderOutageDrill,
  runCanaryRedeliveryDrill,
  runCanaryRollbackDrill,
  validateCanaryCredentialBinding,
  type CanaryApprovalKind,
  type CanaryApprovalRecord,
  type CanaryApprovalSnapshot,
  type CanaryBudgetUsage,
  type CanaryCredentialBinding,
  type CanaryExecutionPermit,
  type CanaryFreshnessEvidence,
  type CanaryPauseSignals,
  type CanaryReadinessContext,
} from "../src/line-canary-enablement-readiness";

const NOW = 50_000;
const SCOPE = "line.canary.fixture";

function approval(kind: CanaryApprovalKind, overrides: Partial<CanaryApprovalRecord> = {}): CanaryApprovalRecord {
  return Object.freeze({ approvalRef: `approval.canary.${kind}.v1`, kind, scopeRef: SCOPE, status: "approved", validFromBucket: NOW - 10, validUntilBucket: NOW + 10, source: "trusted_governance", ...overrides });
}

function snapshot(records: readonly CanaryApprovalRecord[] = canaryApprovalKinds.map((kind) => approval(kind))): CanaryApprovalSnapshot {
  return createCanaryApprovalSnapshot(records, { snapshotRef: "snapshot.line.canary.v1", scopeRef: SCOPE, environment: "staging", policyVersion: 1, createdAtBucket: NOW - 2, expiresAtBucket: NOW + 8, source: "trusted_governance" });
}

function permit(overrides: Partial<CanaryExecutionPermit> = {}): CanaryExecutionPermit {
  return Object.freeze({ permitVersion: 1, permitRef: "permit.line.canary.v1", providerAccountRef: "provider.line.staging", environment: "staging", approvalSnapshotRef: "snapshot.line.canary.v1", credentialReferenceId: "credential.line.staging.v1", credentialVersion: 1, egressPolicyVersion: 1, budgetPolicyVersion: 1, cohortPolicyVersion: 1, issuedAtBucket: NOW - 1, expiresAtBucket: NOW + 4, status: "candidate", source: "trusted_governance", executable: false, productionAuthority: false, ...overrides });
}

function credential(environment: "staging" | "production", overrides: Partial<CanaryCredentialBinding> = {}): CanaryCredentialBinding {
  return Object.freeze({ bindingVersion: 1, bindingRef: `binding.line.${environment}.v1`, provider: "line", environment, credentialReferenceId: `credential.line.${environment}.v1`, credentialVersion: 1, status: "planned", containsSecretValue: false, ...overrides });
}

const freshness = (): readonly CanaryFreshnessEvidence[] => Object.freeze(canaryFreshnessKinds.map((kind) => Object.freeze({ kind, evidenceRef: `evidence.line.${kind}.v1`, verifiedAtBucket: NOW - 1, policyVersion: 1, source: "trusted_governance" as const })));
const usage = (overrides: Partial<CanaryBudgetUsage> = {}): CanaryBudgetUsage => Object.freeze({ requestsInCurrentMinute: 1, messageCount: 1, dailyCostMinorUnitsUsed: 10, monthlyCostMinorUnitsUsed: 100, estimatedRequestCostMinorUnits: 1, retryAttempts: 0, costEvidenceFresh: true, ...overrides });
const healthySignals = (overrides: Partial<CanaryPauseSignals> = {}): CanaryPauseSignals => Object.freeze({ signatureFailureRateBasisPoints: 0, replayConflictRateBasisPoints: 0, provider429RateBasisPoints: 0, provider5xxRateBasisPoints: 0, costUsageBasisPoints: 100, latencyP95Ms: 100, evidenceFailure: false, credentialRevoked: false, approvalRevoked: false, killSwitchActive: false, ...overrides });

function permitExpected(overrides: Partial<Parameters<typeof evaluateCanaryExecutionPermit>[1]> = {}): Parameters<typeof evaluateCanaryExecutionPermit>[1] {
  return { nowBucket: NOW, providerAccountRef: "provider.line.staging", environment: "staging", approvalSnapshotRef: "snapshot.line.canary.v1", credentialReferenceId: "credential.line.staging.v1", credentialVersion: 1, egressPolicyVersion: 1, budgetPolicyVersion: 1, cohortPolicyVersion: 1, ...overrides };
}

function readyContext(overrides: Partial<CanaryReadinessContext> = {}): CanaryReadinessContext {
  return Object.freeze({
    approvalSnapshotCandidate: true,
    credentialBindingCandidate: true,
    permitDecision: evaluateCanaryExecutionPermit(permit(), permitExpected()),
    egressDecision: evaluateCanaryEgressEnforcement({ ...canaryEgressPolicy.exactTarget, redirectTarget: null, policyVersion: 1, source: "trusted_policy" }),
    cohortDecision: Object.freeze({ eligible: true, cohortBucket: 12, reasonCode: "LINE_CANARY_COHORT_SELECTED", clientOverrideAccepted: false, executable: false }),
    budgetDecision: evaluateCanaryBudget(usage()),
    freshnessDecision: evaluateCanaryEvidenceFreshness(freshness(), NOW),
    pauseDecision: evaluateCanaryAutomaticPause(healthySignals()),
    rollbackDrill: runCanaryRollbackDrill({ actorRole: "release_manager", providerAvailable: false, credential: credential("staging"), evidenceWriterAvailable: true, planValidated: true }),
    outageDrill: runCanaryProviderOutageDrill({ providerAvailable: false, killSwitchOperational: true, fallbackIsFakeOnly: true }),
    redeliveryDrillPassed: true,
    killSwitchOperational: true,
    auditEvidenceReady: true,
    privacyRetentionApproved: true,
    operationsReady: true,
    ...overrides,
  });
}

describe("LINE Canary Enablement Readiness", () => {
  describe("immutable approval snapshot", () => {
    it("accepts a complete trusted snapshot only as a candidate", () => {
      const value = snapshot();
      expect(evaluateCanaryApprovalSnapshot(value, NOW, SCOPE)).toEqual({ candidate: true, blockers: [] });
      expect(Object.isFrozen(value)).toBe(true);
      expect(Object.isFrozen(value.approvals)).toBe(true);
      expect(value.approvals.every(Object.isFrozen)).toBe(true);
    });

    it.each(canaryApprovalKinds)("maps missing %s approval to NO-GO", (missing) => {
      const value = snapshot(canaryApprovalKinds.filter((kind) => kind !== missing).map((kind) => approval(kind)));
      expect(evaluateCanaryApprovalSnapshot(value, NOW, SCOPE).blockers).toContain(`APPROVAL_${missing.toUpperCase()}_MISSING`);
    });

    it("rejects expired, revoked, and scope-mismatched approvals", () => {
      const records = canaryApprovalKinds.map((kind) => kind === "security" ? approval(kind, { validUntilBucket: NOW }) : kind === "privacy" ? approval(kind, { status: "revoked" }) : kind === "cost" ? approval(kind, { scopeRef: "line.canary.other" }) : approval(kind));
      const result = evaluateCanaryApprovalSnapshot(snapshot(records), NOW, SCOPE);
      expect(result.blockers).toEqual(expect.arrayContaining(["APPROVAL_SECURITY_EXPIRED", "APPROVAL_PRIVACY_REVOKED", "APPROVAL_COST_SCOPE_MISMATCH"]));
    });

    it("rejects a client-owned snapshot", () => {
      expect(() => createCanaryApprovalSnapshot(canaryApprovalKinds.map((kind) => approval(kind)), { snapshotRef: "snapshot.line.canary.v1", scopeRef: SCOPE, environment: "staging", policyVersion: 1, createdAtBucket: NOW, expiresAtBucket: NOW + 1, source: "client" })).toThrow("LINE_CANARY_APPROVAL_UNTRUSTED");
    });

    it("rejects mutable comment-dump fields", () => {
      const unsafe = { ...approval("architecture"), comment: "unbounded" };
      expect(() => snapshot([unsafe, ...canaryApprovalKinds.filter((kind) => kind !== "architecture").map((kind) => approval(kind))])).toThrow("LINE_CANARY_APPROVAL_INVALID");
    });
  });

  describe("time-bounded execution permit", () => {
    it("binds account, environment, snapshot, credential, egress, budget, and cohort versions", () => {
      expect(evaluateCanaryExecutionPermit(permit(), permitExpected())).toMatchObject({ candidateEligible: true, maximumState: "canary_readiness_candidate", executable: false, productionAuthority: false });
    });

    it.each(["paused", "revoked", "expired"] as const)("rejects a %s permit", (status) => {
      expect(evaluateCanaryExecutionPermit(permit({ status }), permitExpected())).toMatchObject({ candidateEligible: false });
    });

    it("rejects permit expiry and overlong lifetime", () => {
      expect(evaluateCanaryExecutionPermit(permit({ expiresAtBucket: NOW }), permitExpected()).reasonCode).toBe("LINE_CANARY_PERMIT_EXPIRED");
      expect(() => evaluateCanaryExecutionPermit(permit({ expiresAtBucket: NOW + 30 }), permitExpected())).toThrow("LINE_CANARY_PERMIT_INVALID");
    });

    it.each(["providerAccountRef", "approvalSnapshotRef", "credentialVersion", "egressPolicyVersion", "budgetPolicyVersion", "cohortPolicyVersion"] as const)("rejects %s binding mismatch", (field) => {
      const expected = field.endsWith("Version") ? permitExpected({ [field]: 2 }) : permitExpected({ [field]: "other.binding.ref" });
      expect(evaluateCanaryExecutionPermit(permit(), expected).reasonCode).toBe("LINE_CANARY_PERMIT_BINDING_MISMATCH");
    });

    it("cannot claim production or execution authority", () => {
      const unsafe = { ...permit(), executable: true, productionAuthority: true };
      expect(() => evaluateCanaryExecutionPermit(unsafe as CanaryExecutionPermit, permitExpected())).toThrow("LINE_CANARY_PERMIT_INVALID");
    });
  });

  describe("credential binding and egress decision", () => {
    it("stores references and versions without secret values", () => {
      expect(validateCanaryCredentialBinding(credential("staging"))).toMatchObject({ containsSecretValue: false, status: "planned" });
      expect(() => validateCanaryCredentialBinding({ ...credential("staging"), secretValue: "forbidden" } as CanaryCredentialBinding)).toThrow("LINE_CANARY_CREDENTIAL_BINDING_INVALID");
    });

    it("separates staging and production credentials", () => {
      expect(evaluateCanaryCredentialBindings(credential("staging"), credential("production"), permit())).toEqual({ candidate: true, blockers: [] });
      expect(evaluateCanaryCredentialBindings(credential("staging", { credentialReferenceId: "credential.line.shared" }), credential("production", { credentialReferenceId: "credential.line.shared" }), permit()).blockers).toContain("CANARY_CREDENTIAL_ENVIRONMENT_REUSED");
    });

    it.each(["expired", "revoked", "unknown"] as const)("maps %s credential to NO-GO", (status) => {
      expect(evaluateCanaryCredentialBindings(credential("staging", { status }), credential("production"), permit()).candidate).toBe(false);
    });

    it("rejects permit credential version mismatch and never restores revoked credentials", () => {
      expect(evaluateCanaryCredentialBindings(credential("staging", { credentialVersion: 2 }), credential("production"), permit()).blockers).toContain("CANARY_PERMIT_CREDENTIAL_VERSION_MISMATCH");
      expect(rollbackCanaryCredentialBinding(credential("staging", { status: "revoked" })).status).toBe("revoked");
    });

    it("accepts only the exact egress decision without network", () => {
      expect(evaluateCanaryEgressEnforcement({ ...canaryEgressPolicy.exactTarget, redirectTarget: null, policyVersion: 1, source: "trusted_policy" })).toMatchObject({ policyMatched: true, enforcementMode: "decision_only", networkExecuted: false });
    });

    it.each([{ hostname: "*.invalid" }, { url: "https://attacker.invalid" }, { scheme: "http" }, { port: 8443 }, { method: "GET" }])("rejects unsafe egress %#", (override) => {
      expect(() => evaluateCanaryEgressEnforcement({ ...canaryEgressPolicy.exactTarget, redirectTarget: null, policyVersion: 1, source: "trusted_policy", ...override })).toThrow("LINE_CANARY_EGRESS_INVALID");
    });

    it("rejects redirect outside the exact allowlist", () => {
      expect(evaluateCanaryEgressEnforcement({ ...canaryEgressPolicy.exactTarget, redirectTarget: { ...canaryEgressPolicy.exactTarget, hostname: "other.invalid" }, policyVersion: 1, source: "trusted_policy" }).reasonCode).toBe("LINE_CANARY_EGRESS_REDIRECT_MISMATCH");
    });
  });

  describe("cohort, traffic, message, cost, and retry ceilings", () => {
    const cohortInput = { tenantScopeRef: "tenant.canary.fixture", applicationScopeRef: "application.canary.fixture", subjectDigestPrefix: "01234567", messageCount: 1, cohortKey: "internal_operators" };

    it("selects a deterministic bounded cohort", () => {
      const first = evaluateCanaryCohort(cohortInput);
      const second = evaluateCanaryCohort(cohortInput);
      expect(second).toEqual(first);
      expect(first.cohortBucket).toBeGreaterThanOrEqual(0);
      expect(first.cohortBucket).toBeLessThan(10_000);
    });

    it("rejects unknown cohort, scope mismatch, and message overflow", () => {
      expect(evaluateCanaryCohort({ ...cohortInput, cohortKey: "unknown" }).reasonCode).toBe("LINE_CANARY_COHORT_UNKNOWN");
      expect(evaluateCanaryCohort({ ...cohortInput, tenantScopeRef: "tenant.other" }).reasonCode).toBe("LINE_CANARY_COHORT_SCOPE_MISMATCH");
      expect(evaluateCanaryCohort({ ...cohortInput, messageCount: 2 }).reasonCode).toBe("LINE_CANARY_MESSAGE_CEILING_EXCEEDED");
    });

    it("rejects client traffic and budget overrides", () => {
      expect(evaluateCanaryCohort(cohortInput, defaultCanaryCohortPolicy, { trafficBasisPoints: 10_000 }).reasonCode).toBe("LINE_CANARY_COHORT_CLIENT_OVERRIDE_REJECTED");
      expect(evaluateCanaryBudget(usage(), defaultCanaryBudgetPolicy, { dailyCostMinorUnits: 999_999 }).reasonCode).toBe("LINE_CANARY_BUDGET_CLIENT_OVERRIDE_REJECTED");
    });

    it.each([
      ["request", { requestsInCurrentMinute: defaultCanaryBudgetPolicy.maximumRequestsPerMinute }, "LINE_CANARY_REQUEST_BUDGET_EXHAUSTED"],
      ["message", { messageCount: defaultCanaryBudgetPolicy.maximumMessagesPerRequest + 1 }, "LINE_CANARY_MESSAGE_BUDGET_EXHAUSTED"],
      ["daily", { dailyCostMinorUnitsUsed: defaultCanaryBudgetPolicy.dailyCostMinorUnits }, "LINE_CANARY_DAILY_COST_EXHAUSTED"],
      ["monthly", { monthlyCostMinorUnitsUsed: defaultCanaryBudgetPolicy.monthlyCostMinorUnits }, "LINE_CANARY_MONTHLY_COST_EXHAUSTED"],
      ["retry", { retryAttempts: defaultCanaryBudgetPolicy.retryAttemptsPerRequest + 1 }, "LINE_CANARY_RETRY_BUDGET_EXHAUSTED"],
    ] as const)("pauses on %s exhaustion", (_name, override, reason) => {
      expect(evaluateCanaryBudget(usage(override))).toMatchObject({ eligible: false, pauseRequired: true, reasonCode: reason });
    });

    it("rejects stale cost evidence", () => {
      expect(evaluateCanaryBudget(usage({ costEvidenceFresh: false })).reasonCode).toBe("LINE_CANARY_COST_EVIDENCE_STALE");
    });
  });

  describe("freshness, automatic pause, kill switch, and drills", () => {
    it.each(canaryFreshnessKinds)("rejects stale %s evidence", (kind) => {
      const records = freshness().map((record) => record.kind === kind ? { ...record, verifiedAtBucket: NOW - 24 * 31 } : record);
      expect(evaluateCanaryEvidenceFreshness(records, NOW).blockers).toContain(`CANARY_${kind.toUpperCase()}_EVIDENCE_STALE`);
    });

    it.each([
      ["signature", { signatureFailureRateBasisPoints: canaryAutomaticPausePolicy.signatureFailureRateBasisPoints }, "LINE_CANARY_SIGNATURE_FAILURE_SPIKE"],
      ["replay", { replayConflictRateBasisPoints: canaryAutomaticPausePolicy.replayConflictRateBasisPoints }, "LINE_CANARY_REPLAY_CONFLICT_SPIKE"],
      ["429", { provider429RateBasisPoints: canaryAutomaticPausePolicy.provider429RateBasisPoints }, "LINE_CANARY_PROVIDER_429_SPIKE"],
      ["5xx", { provider5xxRateBasisPoints: canaryAutomaticPausePolicy.provider5xxRateBasisPoints }, "LINE_CANARY_PROVIDER_5XX_SPIKE"],
      ["cost", { costUsageBasisPoints: canaryAutomaticPausePolicy.costUsageBasisPoints }, "LINE_CANARY_COST_THRESHOLD"],
      ["latency", { latencyP95Ms: canaryAutomaticPausePolicy.latencyP95Ms }, "LINE_CANARY_LATENCY_THRESHOLD"],
      ["evidence", { evidenceFailure: true }, "LINE_CANARY_EVIDENCE_FAILURE"],
      ["credential", { credentialRevoked: true }, "LINE_CANARY_CREDENTIAL_REVOKED"],
      ["approval", { approvalRevoked: true }, "LINE_CANARY_APPROVAL_REVOKED"],
    ] as const)("pauses on %s signal", (_name, override, reason) => {
      expect(evaluateCanaryAutomaticPause(healthySignals(override))).toMatchObject({ paused: true, dispatchAllowed: false, reasonCodes: expect.arrayContaining([reason]) });
    });

    it("lets kill switch override all and ignores evidence failure for stopping", () => {
      expect(evaluateCanaryAutomaticPause(healthySignals({ killSwitchActive: true })).reasonCodes[0]).toBe("LINE_CANARY_KILL_SWITCH_ACTIVE");
      expect(canaryKillSwitchDecision(true)).toMatchObject({ active: true, dispatchAllowed: false, evidenceFailureMayBlock: false });
    });

    it("rolls back without provider, credential, network, or mutation", () => {
      expect(runCanaryRollbackDrill({ actorRole: "incident_commander", providerAvailable: false, credential: credential("staging", { status: "revoked" }), evidenceWriterAvailable: false, planValidated: true })).toMatchObject({ passed: true, resultingAdapterState: "disabled", resultingTransport: "fake_only", providerDependencyRequired: false, credentialDependencyRequired: false, mutationPerformed: false, networkExecuted: false });
    });

    it("requires rollback authority", () => {
      expect(() => runCanaryRollbackDrill({ actorRole: "tenant_admin", providerAvailable: false, credential: credential("staging"), evidenceWriterAvailable: true, planValidated: true })).toThrow("LINE_CANARY_ROLLBACK_AUTHORITY_INVALID");
    });

    it("simulates credential revocation without restoring or mutating", () => {
      expect(runCanaryCredentialRevocationDrill(credential("staging"))).toEqual({ passed: true, resultingStatus: "revoked", restored: false, mutationPerformed: false, networkExecuted: false });
    });

    it("passes provider outage and exact-redelivery drills locally", () => {
      expect(runCanaryProviderOutageDrill({ providerAvailable: false, killSwitchOperational: true, fallbackIsFakeOnly: true })).toMatchObject({ passed: true, resultingAdapterState: "disabled", networkExecuted: false });
      expect(runCanaryRedeliveryDrill({ firstFingerprint: "0123456789abcdef", replayFingerprint: "0123456789abcdef", providerEventIdStable: true })).toMatchObject({ passed: true, disposition: "replay", duplicateMutationAllowed: false });
      expect(runCanaryRedeliveryDrill({ firstFingerprint: "0123456789abcdef", replayFingerprint: "fedcba9876543210", providerEventIdStable: true })).toMatchObject({ passed: false, disposition: "conflict", duplicateMutationAllowed: false });
    });
  });

  describe("audit evidence, evaluator, and production isolation", () => {
    it("defaults deterministically to NO-GO", () => {
      expect(evaluateLineCanaryReadiness()).toMatchObject({ decision: "NO-GO", controlsReady: false, executable: false, canaryExecutionAuthorized: false, productionAuthority: false });
    });

    it("keeps a fully ready control set NO-GO", () => {
      const result = evaluateLineCanaryReadiness(readyContext());
      expect(result).toMatchObject({ decision: "NO-GO", controlsReady: true, maximumState: "canary_readiness_candidate", providerExecutionAuthorized: false, canaryExecutionAuthorized: false, networkExecuted: false });
      expect(result.blockers).toEqual(expect.arrayContaining(["REAL_LINE_ADAPTER_DISABLED", "CANARY_EXECUTION_NOT_AUTHORIZED", "CREDENTIALS_NOT_PROVISIONED"]));
    });

    it("builds bounded evidence without sensitive fields", () => {
      const evidence = buildCanaryAuditEvidence({ decision: evaluateLineCanaryReadiness(readyContext()), permitRef: "permit.line.canary.v1", snapshotRef: "snapshot.line.canary.v1", egressPolicyVersion: 1, budgetPolicyVersion: 1, cohortPolicyVersion: 1, timeBucket: NOW, cohortBucket: 12 });
      expect(Object.keys(evidence)).toEqual(["evidenceVersion", "lifecycle", "decision", "permitRef", "snapshotRef", "egressPolicyVersion", "budgetPolicyVersion", "cohortPolicyVersion", "reasonCodes", "timeBucket", "cohortBucket", "providerExecutionAuthorized", "canaryExecutionAuthorized", "productionAuthority", "networkExecuted"]);
      expect(JSON.stringify(evidence)).not.toMatch(/payload|uid|token|secret|signature|endpoint|header|authorization|sql|stack/i);
    });

    it("keeps all execution and deployment status disabled", () => {
      expect(lineCanaryEnablementReadinessStatus).toMatchObject({ realAdapter: "disabled", providerExecution: "not_authorized", canaryExecution: "not_authorized", providerTransport: "fake_only", credentials: "not_provisioned", egress: "policy_decision_only", remoteD1: "not_used", deployment: "not_performed", productionUse: "not_allowed", authority: "workbench_only" });
    });

    it("is absent from production and Local Demo composition", () => {
      const entries = readFileSync("src/index.ts", "utf8") + readFileSync("src/local-demo/worker.ts", "utf8");
      expect(entries).not.toMatch(/line-canary-enablement-readiness|LineCanaryReadiness/);
    });

    it("adds no route, SDK, secret, binding, migration, scheduler, or network", () => {
      const packageText = readFileSync("package.json", "utf8");
      const source = readdirSync("src/line-canary-enablement-readiness").map((file) => readFileSync(`src/line-canary-enablement-readiness/${file}`, "utf8")).join("\n");
      expect(packageText).not.toMatch(/@line\/bot-sdk|line-bot-sdk/);
      expect(source).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest|WebSocket|api\.line\.me|process\.env|import\.meta\.env|D1Database|ScheduledController|\bQueue\b/);
      expect(readdirSync("migrations").join("\n")).not.toMatch(/line.*canary|0011/i);
    });
  });
});
