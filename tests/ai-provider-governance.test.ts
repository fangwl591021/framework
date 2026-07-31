import { describe, expect, it } from "vitest";
import { ProviderGovernanceError } from "../src/ai-provider-governance/models";
import { assertDataHandling, assertExactTaskMatrix, assertHardCeiling, assertKillSwitch, assertLifecycleTransition, assertSafeGovernanceEvidence, assertSecretReference, deterministicSample, strictestSensitivity } from "../src/ai-provider-governance/policy";
import { evaluateProviderReadiness, withoutHiddenCriticalFindings } from "../src/ai-provider-governance/readiness";

const policy = { allowedSensitivity: "confidential" as const, allowPromptRetention: false, allowProviderTraining: false, allowCrossRegion: false, requireZeroRetention: true, requireRegionalProcessing: true, requireDeletionCapability: true, maximumRetentionDays: 0, redactionRequired: true, structuredOutputRequired: true };
const ceiling = { maximumRequestsPerDay: 10, maximumEstimatedCostMicrosPerDay: 1000, maximumPremiumRequestsPerDay: 2, maximumConcurrentRequests: 2, maximumInputUnitsPerRequest: 100, maximumOutputUnitsPerRequest: 50, pricingVersion: "local-v1" };
const usage = { requestsToday: 0, estimatedCostMicrosToday: 0, premiumRequestsToday: 0, concurrentRequests: 0 };
const external = { providerKey: "disabled_generic_adapter", providerVersion: "1", environment: "local" as const, external: true, lifecycle: "approved_for_shadow" as const, complianceStatus: "approved" as const, complianceExpiresAt: 2000, dataPolicyActive: true, secretStatus: "active_future" as const, matrixMode: "shadow_only" as const, hardCeilingActive: true, killSwitchState: "enabled" as const, observabilityReady: true, usageEvidenceReady: true, shadowPlanStatus: "approved" as const, shadowPlanExpiresAt: 2000, canaryPlanStatus: "draft" as const, rollbackPlanReady: true, incidentRunbookReady: true, ownerAssigned: true, approvalsSeparated: true, now: 1000 };

describe("AI provider governance contracts", () => {
  it("accepts the ordered lifecycle", () => { expect(() => assertLifecycleTransition(null, "draft")).not.toThrow(); expect(() => assertLifecycleTransition("draft", "compliance_review")).not.toThrow(); expect(() => assertLifecycleTransition("compliance_review", "security_review")).not.toThrow(); expect(() => assertLifecycleTransition("security_review", "approved_for_shadow")).not.toThrow(); });
  it("rejects lifecycle skips", () => expect(() => assertLifecycleTransition("draft", "security_review")).toThrow(/AI_PROVIDER_LIFECYCLE_INVALID/));
  it("keeps revoked terminal", () => expect(() => assertLifecycleTransition("revoked", "draft")).toThrow(/AI_PROVIDER_LIFECYCLE_INVALID/));
  it("keeps retired terminal", () => expect(() => assertLifecycleTransition("retired", "draft")).toThrow(/AI_PROVIDER_LIFECYCLE_INVALID/));
  it.each(["shadow_active", "canary_approved", "canary_active", "production_approved", "production_active"] as const)("blocks unavailable state %s", (state) => expect(() => assertLifecycleTransition("approved_for_shadow", state)).toThrow(ProviderGovernanceError));
  it("selects the stricter sensitivity", () => expect(strictestSensitivity("internal", "restricted")).toBe("restricted"));
  it("allows a compliant confidential request", () => expect(() => assertDataHandling({ taskSensitivity: "internal", inputSensitivity: "confidential", policy, complianceRetentionDays: 0, regionMatches: true, deletionSupported: true })).not.toThrow());
  it("always rejects prohibited data", () => expect(() => assertDataHandling({ taskSensitivity: "prohibited", inputSensitivity: "public", policy, complianceRetentionDays: 0, regionMatches: true, deletionSupported: true })).toThrow(/AI_PROVIDER_DATA_POLICY_DENIED/));
  it("fails restricted data closed by default", () => expect(() => assertDataHandling({ taskSensitivity: "restricted", inputSensitivity: "public", policy, complianceRetentionDays: 0, regionMatches: true, deletionSupported: true })).toThrow());
  it("rejects region mismatch", () => expect(() => assertDataHandling({ taskSensitivity: "internal", inputSensitivity: "internal", policy, complianceRetentionDays: 0, regionMatches: false, deletionSupported: true })).toThrow());
  it("rejects retention mismatch", () => expect(() => assertDataHandling({ taskSensitivity: "internal", inputSensitivity: "internal", policy, complianceRetentionDays: 1, regionMatches: true, deletionSupported: true })).toThrow());
  it("rejects missing deletion capability", () => expect(() => assertDataHandling({ taskSensitivity: "internal", inputSensitivity: "internal", policy, complianceRetentionDays: 0, regionMatches: true, deletionSupported: false })).toThrow());
  it("accepts requests below every hard ceiling", () => expect(() => assertHardCeiling(ceiling, usage, { inputUnits: 10, outputUnits: 10, estimatedCostMicros: 10, premium: false })).not.toThrow());
  it.each([
    [{ ...usage, requestsToday: 10 }, { inputUnits: 1, outputUnits: 1, estimatedCostMicros: 0, premium: false }],
    [{ ...usage, estimatedCostMicrosToday: 999 }, { inputUnits: 1, outputUnits: 1, estimatedCostMicros: 2, premium: false }],
    [{ ...usage, concurrentRequests: 2 }, { inputUnits: 1, outputUnits: 1, estimatedCostMicros: 0, premium: false }],
    [{ ...usage, premiumRequestsToday: 2 }, { inputUnits: 1, outputUnits: 1, estimatedCostMicros: 0, premium: true }],
    [usage, { inputUnits: 101, outputUnits: 1, estimatedCostMicros: 0, premium: false }],
    [usage, { inputUnits: 1, outputUnits: 51, estimatedCostMicros: 0, premium: false }],
  ])("rejects a hard ceiling violation %#", (current, request) => expect(() => assertHardCeiling(ceiling, current, request)).toThrow(/AI_HARD_CEILING_EXCEEDED/));
  it("allows an enabled switch", () => expect(() => assertKillSwitch("enabled", "provider")).not.toThrow());
  it("allows drain completion for non-interactive work", () => expect(() => assertKillSwitch("drain_only", "provider", false)).not.toThrow());
  it.each([["disabled", "provider", "AI_PROVIDER_KILLED"], ["disabled", "model", "AI_MODEL_KILLED"], ["disabled", "task", "AI_TASK_KILLED"], ["disabled", "environment", "AI_ENVIRONMENT_KILLED"], ["drain_only", "provider", "AI_PROVIDER_KILLED"]] as const)("maps switch %s/%s", (state, scope, code) => expect(() => assertKillSwitch(state, scope)).toThrow(code));
  it("accepts only planned secret metadata", () => expect(() => assertSecretReference({ secretReferenceId: "ref", providerKey: "p", environment: "local", referenceName: "future-name", status: "planned", version: 1, createdAt: 1 })).not.toThrow());
  it.each(["secret", "value", "apiKey"])("rejects secret field %s", (key) => expect(() => assertSecretReference({ secretReferenceId: "ref", providerKey: "p", environment: "local", referenceName: "future-name", status: "planned", version: 1, createdAt: 1, [key]: "forbidden" })).toThrow());
  it("rejects future-active secret state", () => expect(() => assertSecretReference({ secretReferenceId: "ref", providerKey: "p", environment: "local", referenceName: "future-name", status: "active_future", version: 1, createdAt: 1 })).toThrow(/AI_PROVIDER_SECRET_NOT_READY/));
  it("accepts exact task shadow mapping", () => expect(() => assertExactTaskMatrix("content.translation", "shadow_only")).not.toThrow());
  it.each(["*", "all", ""])("rejects wildcard task %s", (key) => expect(() => assertExactTaskMatrix(key, "shadow_only")).toThrow());
  it("produces deterministic sampling", () => expect(deterministicSample("same-request", 5000)).toBe(deterministicSample("same-request", 5000)));
  it("bounds invalid sample rates", () => { expect(deterministicSample("x", -1)).toBe(false); expect(deterministicSample("x", 10001)).toBe(false); });
  it("allows bounded safe evidence", () => expect(() => assertSafeGovernanceEvidence({ reasonCode: "SAFE", supportCode: "AIP-123" })).not.toThrow());
  it.each(["prompt", "completion", "authorization", "api_key", "stack", "sql"])("rejects sensitive evidence label %s", (key) => expect(() => assertSafeGovernanceEvidence({ [key]: "x" })).toThrow());
  it("returns ready for complete governance", () => expect(evaluateProviderReadiness(external)).toMatchObject({ result: "ready", score: 100 }));
  it("returns not ready for an external planned secret", () => expect(evaluateProviderReadiness({ ...external, secretStatus: "planned" })).toMatchObject({ result: "not_ready" }));
  it("returns not ready for expired compliance", () => expect(evaluateProviderReadiness({ ...external, complianceExpiresAt: 999 })).toMatchObject({ result: "not_ready" }));
  it("returns local-only readiness for deterministic adapter", () => expect(evaluateProviderReadiness({ ...external, providerKey: "deterministic_local_adapter", external: false })).toMatchObject({ result: "ready_for_local_only" }));
  it("does not permit critical findings to be hidden", () => { const assessment = evaluateProviderReadiness({ ...external, secretStatus: "planned" }); expect(() => withoutHiddenCriticalFindings(assessment, ["SECRET_NOT_VALIDATED"])).toThrow(/CRITICAL_FINDING_CANNOT_HIDE/); });
  it("permits removal of noncritical presentation findings", () => { const assessment = evaluateProviderReadiness({ ...external, providerKey: "deterministic_local_adapter", external: false }); expect(withoutHiddenCriticalFindings(assessment, ["LOCAL_ONLY"]).findings).toHaveLength(0); });
});
