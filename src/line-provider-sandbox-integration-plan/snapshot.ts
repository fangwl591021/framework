import { LineSandboxPlanError, lineProviderSandboxPlanStatus, type LineProviderSandboxPlanSnapshot } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,99}$/;
const snapshotKeys = Object.freeze(["snapshotVersion", "snapshotRef", "policyVersion", "createdAtBucket", "status", "sourceConsolidationRef", "source"]);

export function createLineProviderSandboxPlanSnapshot(input: Readonly<{
  snapshotRef: string;
  policyVersion: number;
  createdAtBucket: number;
  sourceConsolidationRef: string;
  source: "trusted_repository";
}>): LineProviderSandboxPlanSnapshot {
  if (Object.keys(input).some((key) => !["snapshotRef", "policyVersion", "createdAtBucket", "sourceConsolidationRef", "source"].includes(key)) ||
      !referencePattern.test(input.snapshotRef) || !referencePattern.test(input.sourceConsolidationRef) ||
      !Number.isSafeInteger(input.policyVersion) || input.policyVersion < 1 || !Number.isSafeInteger(input.createdAtBucket)) {
    throw new LineSandboxPlanError("PLAN_SNAPSHOT_INVALID");
  }
  if (input.source !== "trusted_repository") throw new LineSandboxPlanError("PLAN_SNAPSHOT_UNTRUSTED");
  return Object.freeze({ snapshotVersion: 1, snapshotRef: input.snapshotRef, policyVersion: input.policyVersion, createdAtBucket: input.createdAtBucket, status: lineProviderSandboxPlanStatus, sourceConsolidationRef: input.sourceConsolidationRef, source: input.source });
}

export function validateLineProviderSandboxPlanSnapshot(snapshot: LineProviderSandboxPlanSnapshot): LineProviderSandboxPlanSnapshot {
  if (!Object.isFrozen(snapshot) || !Object.isFrozen(snapshot.status) || Object.keys(snapshot).some((key) => !snapshotKeys.includes(key)) ||
      snapshot.snapshotVersion !== 1 || snapshot.status !== lineProviderSandboxPlanStatus || !referencePattern.test(snapshot.snapshotRef) ||
      !referencePattern.test(snapshot.sourceConsolidationRef) || !Number.isSafeInteger(snapshot.policyVersion) || snapshot.policyVersion < 1 ||
      !Number.isSafeInteger(snapshot.createdAtBucket)) throw new LineSandboxPlanError("PLAN_SNAPSHOT_INVALID");
  if (snapshot.source !== "trusted_repository") throw new LineSandboxPlanError("PLAN_SNAPSHOT_UNTRUSTED");
  return snapshot;
}
