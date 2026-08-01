import { lineConsolidationStatus, linePhaseKeys, linePhaseLifecycles, type LineCanonicalStateProjection, type LineConsolidationFinding, type LineConsolidationSnapshot } from "./models";

const canonicalFields = Object.freeze(["realAdapter", "providerExecution", "canaryExecution", "providerTransport", "credentials", "publicWebhook", "egress", "remoteD1", "deployment", "productionUse", "authority"] as const);

export function projectCanonicalLineState(snapshot: LineConsolidationSnapshot): Readonly<{ projection: LineCanonicalStateProjection; findings: readonly LineConsolidationFinding[] }> {
  const findings: LineConsolidationFinding[] = [];
  if (!Object.isFrozen(snapshot) || !Object.isFrozen(snapshot.phases) || !snapshot.phases.every(Object.isFrozen)) findings.push(finding("SNAPSHOT_NOT_IMMUTABLE", "snapshot", snapshot.phases.map((item) => item.phase)));
  for (const phase of linePhaseKeys) {
    const record = snapshot.phases.find((item) => item.phase === phase);
    if (!record) {
      findings.push(finding("PHASE_MISSING", phase, [phase]));
      continue;
    }
    if (record.lifecycle !== linePhaseLifecycles[phase]) findings.push(finding("LIFECYCLE_CONTRADICTION", phase, [phase]));
    for (const field of canonicalFields) if (record[field] !== lineConsolidationStatus[field]) findings.push(finding("STATE_CONTRADICTION", field, [phase]));
  }
  const projection: LineCanonicalStateProjection = Object.freeze({ lifecycle: "consolidation_review_candidate", sourcePhases: linePhaseKeys, realAdapter: "disabled", providerExecution: "not_authorized", canaryExecution: "not_authorized", providerSandboxEntry: "not_authorized", providerTransport: "fake_only", credentials: "not_provisioned", publicWebhook: "not_created", egress: "policy_decision_only", remoteD1: "not_used", deployment: "not_performed", productionUse: "not_allowed", authority: "workbench_only", deterministic: true });
  return Object.freeze({ projection, findings: Object.freeze(findings) });
}

function finding(code: string, subject: string, phases: readonly string[]): LineConsolidationFinding {
  return Object.freeze({ severity: "blocking", code, subject, phases: Object.freeze([...phases]) });
}
