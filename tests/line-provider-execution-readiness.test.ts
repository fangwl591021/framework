import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  activateLineKillSwitch,
  buildLineExecutionReadinessEvidence,
  defaultLineCostQuotaPolicy,
  evaluateLineCanaryGate,
  evaluateLineCostQuota,
  evaluateLineEgress,
  evaluateLineExecutionApprovals,
  evaluateLineProviderExecutionReadiness,
  evaluateLineRollback,
  lineCanaryStages,
  lineEgressPolicy,
  lineExecutionApprovalKinds,
  lineKillSwitchDispatchGuard,
  lineProviderExecutionReadinessStatus,
  rollbackLineSecretReference,
  validateLineProviderAccountSeparation,
  validateLineSecretEnvironmentSeparation,
  validateLineSecretReference,
  validateLineSecretRotation,
  type LineExecutionApprovalKind,
  type LineExecutionApprovalRecord,
  type LineExecutionReadinessContext,
  type LineProviderAccountOwnership,
  type LineSecretReferenceMetadata,
} from "../src/line-provider-execution-readiness";

const NOW = 1_000_000;
const SCOPE = "line.execution.fixture";

function approval(kind: LineExecutionApprovalKind, overrides: Partial<LineExecutionApprovalRecord> = {}): LineExecutionApprovalRecord {
  return Object.freeze({
    approvalRef: `approval.${kind}.v1`,
    kind,
    scopeRef: SCOPE,
    status: "approved",
    approverRole: `${kind}.owner`,
    approvedAt: NOW - 10_000,
    expiresAt: NOW + 10_000,
    policyVersion: 1,
    source: "trusted_governance",
    ...overrides,
  });
}

const approvals = (): readonly LineExecutionApprovalRecord[] => Object.freeze(lineExecutionApprovalKinds.map((kind) => approval(kind)));

const secret = (environment: "staging" | "production", overrides: Partial<LineSecretReferenceMetadata> = {}): LineSecretReferenceMetadata => Object.freeze({
  referenceId: `line.${environment}.reference.v1`,
  provider: "line",
  environment,
  version: 1,
  status: "planned",
  containsSecretValue: false,
  ...overrides,
});

const account = (environment: "staging" | "production"): LineProviderAccountOwnership => Object.freeze({
  providerAccountRef: `line.account.${environment}`,
  environment,
  ownerTeamRef: "team.platform.integration",
  operationsOwnerRef: "role.platform.operator",
  billingOwnerRef: "role.cost.owner",
  status: "verified",
  clientOwned: false,
});

const usage = Object.freeze({ requestMinorUnits: 10, dailyMinorUnitsUsed: 100, monthlyMinorUnitsUsed: 1_000, requestsInCurrentMinute: 1, messageCount: 1, retryAttempts: 0 });

function readyContext(overrides: Partial<LineExecutionReadinessContext> = {}): LineExecutionReadinessContext {
  const egressDecision = evaluateLineEgress({ ...lineEgressPolicy.allowedTarget, redirectTarget: null, source: "trusted_policy" });
  const costQuotaDecision = evaluateLineCostQuota(usage);
  const canaryDecision = evaluateLineCanaryGate({ currentStage: "limited", requestedStage: "approved_for_canary", approvalsValid: true, evidenceFresh: true, killSwitchOperational: true, rollbackReady: true, budgetEligible: true, regressionDetected: false });
  const rollbackDecision = evaluateLineRollback({ actorRole: "release_manager", planValidated: true, providerIndependent: true, currentSecretStatus: "planned" });
  return Object.freeze({
    source: "trusted_governance",
    scopeRef: SCOPE,
    now: NOW,
    approvals: approvals(),
    stagingSecretReference: secret("staging"),
    productionSecretReference: secret("production"),
    stagingProviderAccount: account("staging"),
    productionProviderAccount: account("production"),
    egressDecision,
    costQuotaDecision,
    canaryDecision,
    killSwitchOperational: true,
    rollbackDecision,
    incidentReadiness: Object.freeze({ runbookRef: "runbook.line.provider", onCallRotationRef: "oncall.platform", escalationPolicyRef: "escalation.platform", incidentCommanderRole: "incident.commander", status: "current", lastDrillAt: NOW - 1_000 }),
    privacyRetentionApproved: true,
    operationsReady: true,
    auditEvidenceReady: true,
    evidenceFresh: true,
    ...overrides,
  });
}

describe("LINE Provider Execution Readiness", () => {
  describe("approval matrix", () => {
    it("recognizes all six trusted approvals while retaining candidate lifecycle", () => {
      const decision = evaluateLineProviderExecutionReadiness(readyContext());
      expect(decision).toMatchObject({ decision: "NO-GO", lifecycle: "execution_readiness_candidate", controlsReady: true, maximumStage: "approved_for_canary", providerExecutionAuthorized: false });
    });

    it.each(lineExecutionApprovalKinds)("returns NO-GO when %s approval is missing", (missing) => {
      const records = approvals().filter((record) => record.kind !== missing);
      const decision = evaluateLineProviderExecutionReadiness(readyContext({ approvals: records }));
      expect(decision).toMatchObject({ decision: "NO-GO", controlsReady: false });
      expect(decision.blockers).toContain(`APPROVAL_${missing.toUpperCase()}_MISSING`);
    });

    it("rejects expired approval", () => {
      const records = approvals().map((record) => record.kind === "security" ? approval("security", { expiresAt: NOW }) : record);
      expect(evaluateLineProviderExecutionReadiness(readyContext({ approvals: records })).blockers).toContain("APPROVAL_SECURITY_EXPIRED");
    });

    it("rejects revoked approval", () => {
      const records = approvals().map((record) => record.kind === "privacy" ? approval("privacy", { status: "revoked" }) : record);
      expect(evaluateLineProviderExecutionReadiness(readyContext({ approvals: records })).blockers).toContain("APPROVAL_PRIVACY_REVOKED");
    });

    it("rejects approval scope mismatch", () => {
      const records = approvals().map((record) => record.kind === "cost" ? approval("cost", { scopeRef: "line.other.scope" }) : record);
      expect(evaluateLineProviderExecutionReadiness(readyContext({ approvals: records })).blockers).toContain("APPROVAL_COST_SCOPE_MISMATCH");
    });

    it("rejects client-owned approval input", () => {
      expect(() => evaluateLineExecutionApprovals(approvals(), { requiredScopeRef: SCOPE, now: NOW, source: "client" })).toThrow("LINE_EXECUTION_APPROVAL_UNTRUSTED");
    });

    it("rejects comment dump fields in approval metadata", () => {
      const record = { ...approval("architecture"), comment: "unbounded review dump" };
      expect(() => evaluateLineExecutionApprovals([record, ...approvals().filter((item) => item.kind !== "architecture")], { requiredScopeRef: SCOPE, now: NOW, source: "trusted_governance" })).toThrow("LINE_EXECUTION_APPROVAL_INVALID");
    });
  });

  describe("secret reference lifecycle and environment ownership", () => {
    it("accepts bounded reference metadata without a secret value", () => {
      expect(validateLineSecretReference(secret("staging"))).toMatchObject({ containsSecretValue: false, environment: "staging" });
    });

    it("rejects a secret value field", () => {
      const unsafe = { ...secret("staging"), secretValue: "not-allowed" };
      expect(() => validateLineSecretReference(unsafe)).toThrow("LINE_SECRET_REFERENCE_INVALID");
    });

    it("requires different staging and production references", () => {
      expect(validateLineSecretEnvironmentSeparation(secret("staging"), secret("production"))).toMatchObject({ valid: true });
      expect(validateLineSecretEnvironmentSeparation(secret("staging", { referenceId: "line.shared.ref" }), secret("production", { referenceId: "line.shared.ref" }))).toMatchObject({ valid: false, blockers: ["SECRET_ENVIRONMENT_REFERENCE_REUSED"] });
    });

    it.each(["expired", "revoked", "unknown"] as const)("maps %s secret reference to NO-GO", (status) => {
      const decision = evaluateLineProviderExecutionReadiness(readyContext({ productionSecretReference: secret("production", { status }) }));
      expect(decision.controlsReady).toBe(false);
      expect(decision.blockers).toContain(`SECRET_PRODUCTION_${status.toUpperCase()}`);
    });

    it("requires rotation to increment version and change reference", () => {
      expect(validateLineSecretRotation(secret("staging", { status: "rotating" }), secret("staging", { referenceId: "line.staging.reference.v2", version: 2, status: "planned" })).version).toBe(2);
      expect(() => validateLineSecretRotation(secret("staging"), secret("staging", { referenceId: "line.staging.reference.v3", version: 3 }))).toThrow("LINE_SECRET_ROTATION_INVALID");
    });

    it("never revives a revoked reference during rollback", () => {
      expect(rollbackLineSecretReference(secret("production", { status: "revoked" })).status).toBe("revoked");
    });

    it("separates staging and production provider-account ownership", () => {
      expect(validateLineProviderAccountSeparation(account("staging"), account("production"))).toEqual({ valid: true, environmentSeparated: true });
    });
  });

  describe("exact egress policy", () => {
    it("matches only the exact policy target without executing network", () => {
      expect(evaluateLineEgress({ ...lineEgressPolicy.allowedTarget, redirectTarget: null, source: "trusted_policy" })).toMatchObject({ allowedByPolicy: true, networkExecuted: false, dnsAuthority: false, ipAuthority: false });
    });

    it("rejects wildcard hostname", () => {
      expect(() => evaluateLineEgress({ ...lineEgressPolicy.allowedTarget, hostname: "*.invalid", redirectTarget: null, source: "trusted_policy" })).toThrow("LINE_EGRESS_POLICY_INVALID");
    });

    it("rejects arbitrary URL input", () => {
      expect(() => evaluateLineEgress({ url: "https://attacker.invalid/path", source: "trusted_policy" })).toThrow("LINE_EGRESS_POLICY_INVALID");
    });

    it.each([
      { scheme: "http" },
      { port: 8443 },
      { method: "GET" },
      { hostname: "other.invalid" },
    ])("rejects target mismatch $scheme$port$method$hostname", (override) => {
      const candidate = { ...lineEgressPolicy.allowedTarget, ...override, redirectTarget: null, source: "trusted_policy" };
      if (override.hostname) expect(evaluateLineEgress(candidate)).toMatchObject({ allowedByPolicy: false });
      else expect(() => evaluateLineEgress(candidate)).toThrow("LINE_EGRESS_POLICY_INVALID");
    });

    it("rejects a redirect outside the exact allowlist", () => {
      expect(evaluateLineEgress({ ...lineEgressPolicy.allowedTarget, redirectTarget: { ...lineEgressPolicy.allowedTarget, hostname: "redirect.invalid" }, source: "trusted_policy" })).toMatchObject({ allowedByPolicy: false, reasonCode: "LINE_EGRESS_REDIRECT_NOT_ALLOWLISTED" });
    });
  });

  describe("cost, quota, and retry budget", () => {
    it("enforces the per-request hard ceiling", () => {
      expect(evaluateLineCostQuota({ ...usage, requestMinorUnits: defaultLineCostQuotaPolicy.hardRequestMinorUnits + 1 })).toMatchObject({ eligible: false, reasonCode: "LINE_HARD_COST_CEILING_EXCEEDED" });
    });

    it("fails closed on daily exhaustion", () => {
      expect(evaluateLineCostQuota({ ...usage, dailyMinorUnitsUsed: defaultLineCostQuotaPolicy.dailyMinorUnits })).toMatchObject({ eligible: false, reasonCode: "LINE_DAILY_BUDGET_EXHAUSTED" });
    });

    it("fails closed on monthly exhaustion", () => {
      expect(evaluateLineCostQuota({ ...usage, monthlyMinorUnitsUsed: defaultLineCostQuotaPolicy.monthlyMinorUnits })).toMatchObject({ eligible: false, reasonCode: "LINE_MONTHLY_BUDGET_EXHAUSTED" });
    });

    it("bounds request rate and message count", () => {
      expect(evaluateLineCostQuota({ ...usage, requestsInCurrentMinute: defaultLineCostQuotaPolicy.requestsPerMinute }).reasonCode).toBe("LINE_REQUEST_RATE_EXHAUSTED");
      expect(evaluateLineCostQuota({ ...usage, messageCount: defaultLineCostQuotaPolicy.messagesPerRequest + 1 }).reasonCode).toBe("LINE_MESSAGE_COUNT_EXCEEDED");
    });

    it("does not let retry bypass its budget", () => {
      expect(evaluateLineCostQuota({ ...usage, retryAttempts: defaultLineCostQuotaPolicy.retryAttemptsPerRequest + 1 })).toMatchObject({ eligible: false, reasonCode: "LINE_RETRY_BUDGET_EXHAUSTED", remainingRetryAttempts: 0 });
    });

    it("rejects every client limit override", () => {
      expect(evaluateLineCostQuota(usage, defaultLineCostQuotaPolicy, { dailyMinorUnits: 999_999 })).toMatchObject({ eligible: false, reasonCode: "LINE_CLIENT_LIMIT_OVERRIDE_REJECTED", clientOverrideAccepted: false });
    });
  });

  describe("canary, kill switch, and rollback", () => {
    it("defines no production canary stage", () => {
      expect(lineCanaryStages).toEqual(["disabled", "internal", "limited", "paused", "approved_for_canary"]);
      expect(JSON.stringify(lineCanaryStages)).not.toMatch(/production_active|approved_for_production/);
    });

    it("requires every promotion gate", () => {
      const decision = evaluateLineCanaryGate({ currentStage: "limited", requestedStage: "approved_for_canary", approvalsValid: true, evidenceFresh: true, killSwitchOperational: true, rollbackReady: true, budgetEligible: true, regressionDetected: false });
      expect(decision).toMatchObject({ allowed: true, resultingStage: "approved_for_canary", productionAuthority: false, networkExecuted: false });
    });

    it("blocks promotion with stale evidence", () => {
      expect(evaluateLineCanaryGate({ currentStage: "internal", requestedStage: "limited", approvalsValid: true, evidenceFresh: false, killSwitchOperational: true, rollbackReady: true, budgetEligible: true, regressionDetected: false })).toMatchObject({ allowed: false, reasonCode: "LINE_CANARY_EVIDENCE_STALE" });
    });

    it("pauses canary on regression", () => {
      expect(evaluateLineCanaryGate({ currentStage: "limited", requestedStage: "approved_for_canary", approvalsValid: true, evidenceFresh: true, killSwitchOperational: true, rollbackReady: true, budgetEligible: true, regressionDetected: true })).toMatchObject({ allowed: true, resultingStage: "paused", reasonCode: "LINE_CANARY_REGRESSION_PAUSED" });
    });

    it("rejects skipped canary transition", () => {
      expect(() => evaluateLineCanaryGate({ currentStage: "disabled", requestedStage: "limited", approvalsValid: true, evidenceFresh: true, killSwitchOperational: true, rollbackReady: true, budgetEligible: true, regressionDetected: false })).toThrow("LINE_CANARY_TRANSITION_INVALID");
    });

    it("lets kill switch override dispatch even when evidence storage fails", () => {
      expect(activateLineKillSwitch({ actorRole: "incident_commander", reasonCode: "LINE_INCIDENT_STOP", evidenceWriterAvailable: false })).toMatchObject({ active: true, dispatchAllowed: false, evidenceFailureMayBlock: false });
      expect(lineKillSwitchDispatchGuard(false)).toMatchObject({ dispatchAllowed: false, reasonCode: "LINE_PROVIDER_EXECUTION_NOT_AUTHORIZED" });
    });

    it("requires explicit rollback authority", () => {
      expect(() => evaluateLineRollback({ actorRole: "tenant_admin", planValidated: true, providerIndependent: true, currentSecretStatus: "planned" })).toThrow("LINE_ROLLBACK_AUTHORITY_INVALID");
    });

    it("rolls back to disabled without provider dependency or revoked-secret revival", () => {
      expect(evaluateLineRollback({ actorRole: "release_manager", planValidated: true, providerIndependent: true, currentSecretStatus: "revoked" })).toMatchObject({ allowed: true, resultingAdapterState: "disabled", secretState: "remains_revoked", providerDependencyRequired: false });
    });
  });

  describe("evaluator, evidence, and production isolation", () => {
    it("defaults deterministically to NO-GO", () => {
      expect(evaluateLineProviderExecutionReadiness()).toMatchObject({ decision: "NO-GO", controlsReady: false, providerExecutionAuthorized: false, productionAuthority: false });
    });

    it("blocks stale incident/on-call evidence", () => {
      const context = readyContext({ incidentReadiness: { ...readyContext().incidentReadiness, status: "stale" } });
      expect(evaluateLineProviderExecutionReadiness(context).blockers).toContain("INCIDENT_ON_CALL_NOT_READY");
    });

    it("builds bounded allowlisted evidence without sensitive fields", () => {
      const context = readyContext();
      const decision = evaluateLineProviderExecutionReadiness(context);
      const approvalResult = evaluateLineExecutionApprovals(context.approvals, { requiredScopeRef: SCOPE, now: NOW, source: "trusted_governance" });
      const evidence = buildLineExecutionReadinessEvidence({ decision, approvalRefs: approvalResult.approvalRefs, policyVersion: 1, timestampBucket: "2026-08-01T12" });
      expect(Object.keys(evidence)).toEqual(["evidenceVersion", "lifecycle", "decision", "controlsReady", "approvalRefs", "policyVersion", "reasonCodes", "timestampBucket", "realAdapter", "providerExecution", "networkExecuted"]);
      expect(JSON.stringify(evidence)).not.toMatch(/secret|token|payload|uid|endpoint|header|authorization|sql|stack/i);
    });

    it("keeps the real adapter disabled and Workbench authoritative", () => {
      expect(lineProviderExecutionReadinessStatus).toMatchObject({ realAdapter: "disabled", providerTransport: "fake_only", providerExecution: "not_authorized", egress: "policy_only", authority: "workbench_only", productionUse: "not_allowed" });
    });

    it("does not import execution readiness from production or local composition", () => {
      const entries = readFileSync("src/index.ts", "utf8") + readFileSync("src/local-demo/worker.ts", "utf8");
      expect(entries).not.toMatch(/line-provider-execution-readiness|LineExecutionReadiness/);
    });

    it("adds no SDK, secret, binding, migration, or route", () => {
      const packageText = readFileSync("package.json", "utf8");
      const wranglerText = readdirSync(".").filter((file) => /^wrangler.*\.jsonc$/.test(file)).map((file) => readFileSync(file, "utf8")).join("\n");
      expect(packageText).not.toMatch(/@line\/bot-sdk|line-bot-sdk/);
      expect(wranglerText).not.toMatch(/LINE_CHANNEL|line-provider-execution/);
      expect(readdirSync("migrations").join("\n")).not.toMatch(/line.*execution|0011/i);
    });

    it("contains no network or environment-secret access", () => {
      const source = readdirSync("src/line-provider-execution-readiness").map((file) => readFileSync(`src/line-provider-execution-readiness/${file}`, "utf8")).join("\n");
      expect(source).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest|WebSocket|process\.env|import\.meta\.env/);
    });
  });
});
