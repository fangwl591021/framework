import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canonicalLineControlClaims,
  canonicalPhaseRecord,
  classifyLineEvidenceGaps,
  createLineConsolidationSnapshot,
  decideLineProviderSandboxEntry,
  detectLineControlFindings,
  evaluateLineEnablementConsolidation,
  lineConsolidationStatus,
  lineControlKeys,
  lineEvidenceCategories,
  linePhaseKeys,
  localEvidenceCategories,
  localEvidenceRecord,
  pendingRealWorldEvidenceRecord,
  projectCanonicalLineState,
  realWorldEvidenceCategories,
  type LineConsolidationSnapshot,
  type LineControlClaim,
  type LineEvidenceRecord,
  type LinePhaseSnapshotRecord,
} from "../src/line-enablement-consolidation-review";

const NOW = 80_000;

function snapshot(phases: readonly LinePhaseSnapshotRecord[] = linePhaseKeys.map((phase) => canonicalPhaseRecord(phase, NOW))): LineConsolidationSnapshot {
  return createLineConsolidationSnapshot(phases, { snapshotRef: "snapshot.line.consolidation.v1", policyVersion: 1, createdAtBucket: NOW, source: "trusted_repository" });
}

function pendingEvidence(): readonly LineEvidenceRecord[] {
  return Object.freeze([...localEvidenceCategories.map((category) => localEvidenceRecord(category, NOW)), ...realWorldEvidenceCategories.map(pendingRealWorldEvidenceRecord)]);
}

function completeEvidence(): readonly LineEvidenceRecord[] {
  return Object.freeze([...localEvidenceCategories.map((category) => localEvidenceRecord(category, NOW)), ...realWorldEvidenceCategories.map((category) => Object.freeze({ category, evidenceClass: "real_world_prerequisite" as const, evidenceRef: `evidence.real.${category}.v1`, sourcePhase: "external_governance" as const, status: "verified" as const, verifiedAtBucket: NOW, maximumAgeBuckets: 24 * 30, source: "trusted_governance" as const }))]);
}

describe("LINE Enablement Consolidation Review", () => {
  describe("immutable four-phase snapshot", () => {
    it("accepts exactly the four canonical phases in stable order", () => {
      const value = snapshot();
      expect(value.phases.map((item) => item.phase)).toEqual(linePhaseKeys);
      expect(Object.isFrozen(value)).toBe(true);
      expect(Object.isFrozen(value.phases)).toBe(true);
      expect(value.phases.every(Object.isFrozen)).toBe(true);
    });

    it("rejects missing, duplicate, and client-owned phase snapshots", () => {
      expect(() => snapshot(linePhaseKeys.slice(0, 3).map((phase) => canonicalPhaseRecord(phase, NOW)))).toThrow("LINE_CONSOLIDATION_SNAPSHOT_INVALID");
      expect(() => snapshot([canonicalPhaseRecord("adapter_enablement_readiness", NOW), canonicalPhaseRecord("adapter_enablement_readiness", NOW), canonicalPhaseRecord("provider_execution_readiness", NOW), canonicalPhaseRecord("canary_enablement_readiness", NOW)])).toThrow("LINE_CONSOLIDATION_SNAPSHOT_INVALID");
      expect(() => createLineConsolidationSnapshot(linePhaseKeys.map((phase) => canonicalPhaseRecord(phase, NOW)), { snapshotRef: "snapshot.line.consolidation.v1", policyVersion: 1, createdAtBucket: NOW, source: "client" })).toThrow("LINE_CONSOLIDATION_SNAPSHOT_UNTRUSTED");
    });

    it("rejects arbitrary snapshot metadata", () => {
      const unsafe = { ...canonicalPhaseRecord("adapter_enablement_readiness", NOW), comment: "unbounded" };
      expect(() => snapshot([unsafe, ...linePhaseKeys.slice(1).map((phase) => canonicalPhaseRecord(phase, NOW))])).toThrow("LINE_CONSOLIDATION_SNAPSHOT_INVALID");
    });
  });

  describe("canonical lifecycle and state projection", () => {
    it("projects one deterministic canonical state", () => {
      const first = projectCanonicalLineState(snapshot());
      const second = projectCanonicalLineState(snapshot());
      expect(second).toEqual(first);
      expect(first.findings).toEqual([]);
      expect(first.projection).toMatchObject(lineConsolidationStatus);
      expect(first.projection.sourcePhases).toEqual(linePhaseKeys);
    });

    it.each([
      ["realAdapter", "enabled"],
      ["providerExecution", "authorized"],
      ["canaryExecution", "authorized"],
      ["providerTransport", "real"],
      ["credentials", "provisioned"],
      ["publicWebhook", "created"],
      ["egress", "enabled"],
      ["remoteD1", "used"],
      ["deployment", "performed"],
      ["productionUse", "allowed"],
      ["authority", "provider"],
    ] as const)("detects %s contradiction", (field, value) => {
      const phases = linePhaseKeys.map((phase) => phase === "canary_enablement_readiness" ? { ...canonicalPhaseRecord(phase, NOW), [field]: value } : canonicalPhaseRecord(phase, NOW));
      expect(projectCanonicalLineState(snapshot(phases as readonly LinePhaseSnapshotRecord[])).findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "STATE_CONTRADICTION", subject: field })]));
    });

    it("detects lifecycle contradiction", () => {
      const phases = linePhaseKeys.map((phase) => phase === "provider_execution_readiness" ? { ...canonicalPhaseRecord(phase, NOW), lifecycle: "readiness_candidate" } : canonicalPhaseRecord(phase, NOW));
      expect(projectCanonicalLineState(snapshot(phases as readonly LinePhaseSnapshotRecord[])).findings).toContainEqual(expect.objectContaining({ code: "LIFECYCLE_CONTRADICTION", subject: "provider_execution_readiness" }));
    });
  });

  describe("overlap, duplicate, and authority detector", () => {
    it("treats canonical overlap as contributions rather than duplicate authority", () => {
      expect(detectLineControlFindings(canonicalLineControlClaims)).toEqual([]);
      expect(new Set(canonicalLineControlClaims.map((item) => item.control))).toEqual(new Set(lineControlKeys));
    });

    it("detects exact duplicate claims", () => {
      const duplicate = canonicalLineControlClaims[0]!;
      expect(detectLineControlFindings([...canonicalLineControlClaims, duplicate])).toContainEqual(expect.objectContaining({ code: "DUPLICATE_CONTROL_CLAIM", subject: duplicate.control }));
    });

    it("detects duplicate canonical ownership", () => {
      const claim: LineControlClaim = Object.freeze({ control: "normalization", phase: "consolidation_review", claimType: "canonical_owner", authority: "none" });
      expect(detectLineControlFindings([...canonicalLineControlClaims, claim])).toContainEqual(expect.objectContaining({ code: "DUPLICATE_CANONICAL_OWNER", subject: "normalization" }));
    });

    it.each(["provider", "canary"] as const)("rejects %s execution authority", (authority) => {
      const claim: LineControlClaim = Object.freeze({ control: "egress_policy", phase: "consolidation_review", claimType: "execution_authority", authority });
      expect(detectLineControlFindings([...canonicalLineControlClaims, claim])).toContainEqual(expect.objectContaining({ code: "EXECUTION_AUTHORITY_CONTRADICTION" }));
    });

    it("rejects duplicate Workbench authority", () => {
      const claim: LineControlClaim = Object.freeze({ control: "capability_rendering", phase: "adapter_enablement_readiness", claimType: "governance", authority: "workbench_only" });
      expect(detectLineControlFindings([...canonicalLineControlClaims, claim])).toContainEqual(expect.objectContaining({ code: "WORKBENCH_AUTHORITY_DUPLICATION" }));
    });

    it("rejects unknown claim metadata", () => {
      expect(() => detectLineControlFindings([{ ...canonicalLineControlClaims[0], ownerComment: "unsafe" } as LineControlClaim])).toThrow("LINE_CONSOLIDATION_CLAIM_INVALID");
    });
  });

  describe("evidence inventory, freshness, and real-world separation", () => {
    it("classifies all local controls separately from real-world prerequisites", () => {
      const result = classifyLineEvidenceGaps(pendingEvidence(), NOW);
      expect(result.locallyCompletedControls).toEqual(localEvidenceCategories);
      expect(result.realWorldPrerequisites).toEqual(realWorldEvidenceCategories);
      expect(result.localEvidenceComplete).toBe(true);
      expect(result.realWorldEvidenceComplete).toBe(false);
    });

    it("classifies complete fresh external evidence without granting authority", () => {
      const result = classifyLineEvidenceGaps(completeEvidence(), NOW);
      expect(result).toMatchObject({ localEvidenceComplete: true, realWorldEvidenceComplete: true, staleEvidence: [], missingEvidence: [], realWorldPrerequisites: [] });
    });

    it.each(["signature_vectors", "rollback_simulation", "provider_credentials", "execution_approval"] as const)("detects stale %s evidence", (category) => {
      const records = completeEvidence().map((record) => record.category === category ? { ...record, verifiedAtBucket: NOW - record.maximumAgeBuckets - 1 } : record);
      expect(classifyLineEvidenceGaps(records, NOW).staleEvidence).toContain(category);
    });

    it.each(["webhook_contract", "provider_sandbox_account", "privacy_approval"] as const)("detects missing %s evidence", (category) => {
      const records = pendingEvidence().filter((record) => record.category !== category);
      expect(classifyLineEvidenceGaps(records, NOW).missingEvidence).toContain(category);
    });

    it("rejects wrong evidence class, duplicate category, and unsafe metadata", () => {
      const record = localEvidenceRecord("signature_contract", NOW);
      expect(() => classifyLineEvidenceGaps([{ ...record, evidenceClass: "real_world_prerequisite" }], NOW)).toThrow("LINE_CONSOLIDATION_EVIDENCE_INVALID");
      expect(() => classifyLineEvidenceGaps([record, record], NOW)).toThrow("LINE_CONSOLIDATION_EVIDENCE_INVALID");
      expect(() => classifyLineEvidenceGaps([{ ...record, rawPayload: "unsafe" } as LineEvidenceRecord], NOW)).toThrow("LINE_CONSOLIDATION_EVIDENCE_INVALID");
    });

    it("covers every canonical evidence category exactly once", () => {
      expect([...localEvidenceCategories, ...realWorldEvidenceCategories]).toEqual(lineEvidenceCategories);
      expect(new Set(lineEvidenceCategories).size).toBe(lineEvidenceCategories.length);
    });
  });

  describe("sandbox entry and consolidated decision", () => {
    it("defaults sandbox entry to NO-GO", () => {
      expect(decideLineProviderSandboxEntry()).toMatchObject({ decision: "NO-GO", criteriaComplete: false, providerSandboxEntryAuthorized: false, providerExecutionAuthorized: false, canaryExecutionAuthorized: false });
    });

    it("keeps sandbox entry NO-GO with all modeled criteria complete", () => {
      const evidence = classifyLineEvidenceGaps(completeEvidence(), NOW);
      const result = decideLineProviderSandboxEntry({ evidence, canonicalStateConsistent: true, duplicateAuthorityFree: true, workbenchSoleAuthority: true });
      expect(result).toMatchObject({ decision: "NO-GO", criteriaComplete: true, providerSandboxEntryAuthorized: false, providerExecutionAuthorized: false, canaryExecutionAuthorized: false, productionAuthority: false, networkExecuted: false });
      expect(result.blockers).toEqual(expect.arrayContaining(["PROVIDER_SANDBOX_ENTRY_NOT_AUTHORIZED", "REAL_LINE_ADAPTER_DISABLED"]));
    });

    it.each(realWorldEvidenceCategories)("lists missing real-world %s separately", (category) => {
      const evidence = classifyLineEvidenceGaps(pendingEvidence(), NOW);
      expect(decideLineProviderSandboxEntry({ evidence, canonicalStateConsistent: true, duplicateAuthorityFree: true, workbenchSoleAuthority: true }).blockers).toContain(`REAL_WORLD_${category.toUpperCase()}_REQUIRED`);
    });

    it("defaults consolidation to deterministic NO-GO", () => {
      expect(evaluateLineEnablementConsolidation()).toMatchObject({ decision: "NO-GO", providerExecutionAuthorized: false, canaryExecutionAuthorized: false, providerSandboxEntryAuthorized: false });
    });

    it("consolidates local completion while preserving real-world NO-GO", () => {
      const result = evaluateLineEnablementConsolidation({ snapshot: snapshot(), evidence: pendingEvidence(), nowBucket: NOW });
      expect(result).toMatchObject({ decision: "NO-GO", canonicalStateConsistent: true, duplicateAuthorityFree: true, localEvidenceComplete: true, realWorldEvidenceComplete: false, providerExecutionAuthorized: false, canaryExecutionAuthorized: false, providerSandboxEntryAuthorized: false, productionAuthority: false, networkExecuted: false });
      expect(result.blockers).toContain("REAL_WORLD_EVIDENCE_INCOMPLETE");
    });

    it("remains NO-GO even with complete fresh modeled evidence", () => {
      const result = evaluateLineEnablementConsolidation({ snapshot: snapshot(), evidence: completeEvidence(), nowBucket: NOW });
      expect(result).toMatchObject({ decision: "NO-GO", canonicalStateConsistent: true, duplicateAuthorityFree: true, localEvidenceComplete: true, realWorldEvidenceComplete: true, providerExecutionAuthorized: false });
      expect(result.blockers).toContain("PROVIDER_SANDBOX_ENTRY_NOT_AUTHORIZED");
    });

    it("fails closed on contradiction and duplicate authority", () => {
      const phases = linePhaseKeys.map((phase) => phase === "canary_enablement_readiness" ? { ...canonicalPhaseRecord(phase, NOW), providerExecution: "authorized" } : canonicalPhaseRecord(phase, NOW));
      const claim: LineControlClaim = Object.freeze({ control: "egress_policy", phase: "canary_enablement_readiness", claimType: "execution_authority", authority: "canary" });
      const result = evaluateLineEnablementConsolidation({ snapshot: snapshot(phases as readonly LinePhaseSnapshotRecord[]), controlClaims: [...canonicalLineControlClaims, claim], evidence: completeEvidence(), nowBucket: NOW });
      expect(result).toMatchObject({ canonicalStateConsistent: false, duplicateAuthorityFree: false, decision: "NO-GO" });
      expect(result.blockers).toEqual(expect.arrayContaining(["CANONICAL_STATE_INCONSISTENT", "DUPLICATE_AUTHORITY_DETECTED"]));
    });
  });

  describe("hard isolation", () => {
    it("preserves exact disabled and Workbench-only status", () => {
      expect(lineConsolidationStatus).toEqual({ lifecycle: "consolidation_review_candidate", realAdapter: "disabled", providerExecution: "not_authorized", canaryExecution: "not_authorized", providerSandboxEntry: "not_authorized", providerTransport: "fake_only", credentials: "not_provisioned", publicWebhook: "not_created", egress: "policy_decision_only", remoteD1: "not_used", deployment: "not_performed", productionUse: "not_allowed", authority: "workbench_only" });
    });

    it("is absent from production and Local Demo composition", () => {
      const entries = readFileSync("src/index.ts", "utf8") + readFileSync("src/local-demo/worker.ts", "utf8");
      expect(entries).not.toMatch(/line-enablement-consolidation-review|LineConsolidation/);
    });

    it("adds no route, SDK, secret, migration, binding, scheduler, or network", () => {
      const packageText = readFileSync("package.json", "utf8");
      const source = readdirSync("src/line-enablement-consolidation-review").map((file) => readFileSync(`src/line-enablement-consolidation-review/${file}`, "utf8")).join("\n");
      expect(packageText).not.toMatch(/@line\/bot-sdk|line-bot-sdk/);
      expect(source).not.toMatch(/\bfetch\s*\(|axios|XMLHttpRequest|WebSocket|api\.line\.me|process\.env|import\.meta\.env|D1Database|ScheduledController|\bQueue\b|\bCron\b/);
      expect(readdirSync("migrations").join("\n")).not.toMatch(/line.*consolidation|0011/i);
    });

    it("does not redefine disabled_line_adapter", () => {
      const source = readdirSync("src/line-enablement-consolidation-review").map((file) => readFileSync(`src/line-enablement-consolidation-review/${file}`, "utf8")).join("\n");
      expect(source).not.toContain("disabled_line_adapter");
    });
  });
});
