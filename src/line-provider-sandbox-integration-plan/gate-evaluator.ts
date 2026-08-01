import { LineSandboxPlanError, lineSandboxGateKeys, type LineSandboxGateEvidence, type LineSandboxGateKey, type LineSandboxGateResult, type LineSandboxPlanReasonCode } from "./models";

const gateReason: Readonly<Record<LineSandboxGateKey, LineSandboxPlanReasonCode>> = Object.freeze({ architecture: "ARCHITECTURE_GATE_MISSING", security: "SECURITY_GATE_MISSING", privacy: "PRIVACY_GATE_MISSING", operations: "OPERATIONS_GATE_MISSING", cost: "COST_GATE_MISSING", execution: "EXECUTION_GATE_MISSING" });
const referencePattern = /^[a-z][a-z0-9_.:-]{2,99}$/;
const rolePattern = /^[a-z][a-z0-9_]{2,47}$/;

export function evaluateLineSandboxGates(records: readonly LineSandboxGateEvidence[], nowBucket: number): LineSandboxGateResult {
  if (!Number.isSafeInteger(nowBucket) || records.length > lineSandboxGateKeys.length) throw new LineSandboxPlanError("GATE_EVIDENCE_INVALID");
  const byGate = new Map<LineSandboxGateKey, LineSandboxGateEvidence>();
  for (const record of records) {
    const keys = ["gate", "status", "evidenceRef", "approvedAtBucket", "maximumAgeBuckets", "approverRole", "source"];
    if (Object.keys(record).some((key) => !keys.includes(key)) || !lineSandboxGateKeys.includes(record.gate) || byGate.has(record.gate) ||
        !["approved", "missing", "expired"].includes(record.status) || !referencePattern.test(record.evidenceRef) || !rolePattern.test(record.approverRole) ||
        !Number.isSafeInteger(record.maximumAgeBuckets) || record.maximumAgeBuckets < 1 || record.maximumAgeBuckets > 24 * 365 ||
        (record.approvedAtBucket !== null && !Number.isSafeInteger(record.approvedAtBucket)) || record.source !== "trusted_governance") throw new LineSandboxPlanError("GATE_EVIDENCE_INVALID");
    byGate.set(record.gate, record);
  }
  const missing: LineSandboxGateKey[] = [];
  const stale: LineSandboxGateKey[] = [];
  const reasonCodes: LineSandboxPlanReasonCode[] = [];
  for (const gate of lineSandboxGateKeys) {
    const record = byGate.get(gate);
    if (!record || record.status === "missing") { missing.push(gate); reasonCodes.push(gateReason[gate]); continue; }
    if (record.status === "expired" || record.approvedAtBucket === null || record.approvedAtBucket > nowBucket || nowBucket - record.approvedAtBucket > record.maximumAgeBuckets) { stale.push(gate); reasonCodes.push(gateReason[gate]); }
  }
  if (stale.length) reasonCodes.push("GATE_EVIDENCE_STALE");
  return Object.freeze({ complete: missing.length === 0 && stale.length === 0, missing: Object.freeze(missing), stale: Object.freeze(stale), reasonCodes: Object.freeze([...new Set(reasonCodes)].sort()) });
}

export function pendingLineSandboxGate(gate: LineSandboxGateKey): LineSandboxGateEvidence {
  return Object.freeze({ gate, status: "missing", evidenceRef: `gate.pending.${gate}.v1`, approvedAtBucket: null, maximumAgeBuckets: 24 * 30, approverRole: `${gate}_owner`, source: "trusted_governance" });
}
