import { LineConsolidationError, linePhaseKeys, linePhaseLifecycles, type LineConsolidationSnapshot, type LinePhaseKey, type LinePhaseSnapshotRecord } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,99}$/;

export function createLineConsolidationSnapshot(
  phases: readonly LinePhaseSnapshotRecord[],
  input: Readonly<{ snapshotRef: string; policyVersion: number; createdAtBucket: number; source: "trusted_repository" | "client" }>,
): LineConsolidationSnapshot {
  if (input.source !== "trusted_repository") throw new LineConsolidationError("LINE_CONSOLIDATION_SNAPSHOT_UNTRUSTED");
  if (!referencePattern.test(input.snapshotRef) || !Number.isSafeInteger(input.policyVersion) || input.policyVersion < 1 || !Number.isSafeInteger(input.createdAtBucket) || phases.length !== linePhaseKeys.length) throw new LineConsolidationError("LINE_CONSOLIDATION_SNAPSHOT_INVALID");
  const allowedKeys = ["phase", "lifecycle", "evidenceRef", "verifiedAtBucket", "realAdapter", "providerExecution", "canaryExecution", "providerTransport", "credentials", "publicWebhook", "egress", "remoteD1", "deployment", "productionUse", "authority", "source"];
  const byPhase = new Map<LinePhaseKey, LinePhaseSnapshotRecord>();
  for (const phase of phases) {
    if (Object.keys(phase).some((key) => !allowedKeys.includes(key)) || !linePhaseKeys.includes(phase.phase) || !referencePattern.test(phase.evidenceRef) || !Number.isSafeInteger(phase.verifiedAtBucket) || phase.source !== "trusted_repository" || byPhase.has(phase.phase)) throw new LineConsolidationError("LINE_CONSOLIDATION_SNAPSHOT_INVALID");
    byPhase.set(phase.phase, phase);
  }
  const ordered = Object.freeze(linePhaseKeys.map((phase) => Object.freeze({ ...byPhase.get(phase)! })));
  return Object.freeze({ snapshotVersion: 1, snapshotRef: input.snapshotRef, policyVersion: input.policyVersion, createdAtBucket: input.createdAtBucket, phases: ordered, source: "trusted_repository" });
}

export function canonicalPhaseRecord(phase: LinePhaseKey, verifiedAtBucket: number): LinePhaseSnapshotRecord {
  return Object.freeze({ phase, lifecycle: linePhaseLifecycles[phase], evidenceRef: `evidence.${phase}.v1`, verifiedAtBucket, realAdapter: "disabled", providerExecution: "not_authorized", canaryExecution: "not_authorized", providerTransport: "fake_only", credentials: "not_provisioned", publicWebhook: "not_created", egress: "policy_decision_only", remoteD1: "not_used", deployment: "not_performed", productionUse: "not_allowed", authority: "workbench_only", source: "trusted_repository" });
}
