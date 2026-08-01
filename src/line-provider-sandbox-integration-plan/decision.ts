import { validateLineCredentialReference } from "./credential-reference";
import { validateLineEgressAllowlistContract } from "./egress-contract";
import { evaluateLineSandboxEntryExit } from "./entry-exit-evaluator";
import { evaluateLineSandboxGates } from "./gate-evaluator";
import { LineSandboxPlanError, lineProviderSandboxPlanStatus, type LineCredentialReferenceContract, type LineEgressAllowlistContract, type LineProviderSandboxPlanDecision, type LineProviderSandboxPlanSnapshot, type LineSandboxGateEvidence, type LineSandboxTestRecord, type LineSandboxTransportContract, type LineWebhookIngressContract } from "./models";
import { validateLineProviderSandboxPlanSnapshot } from "./snapshot";
import { evaluateLineSandboxTestMatrix } from "./test-matrix";
import { validateLineSandboxTransportContract } from "./transport-contract";
import { validateLineWebhookIngressContract } from "./webhook-contract";

export function decideLineProviderSandboxIntegrationPlan(input?: Readonly<{
  snapshot: LineProviderSandboxPlanSnapshot;
  transport: LineSandboxTransportContract;
  credentialReferences: readonly LineCredentialReferenceContract[];
  webhook: LineWebhookIngressContract;
  egress: LineEgressAllowlistContract;
  testRecords: readonly LineSandboxTestRecord[];
  gateEvidence: readonly LineSandboxGateEvidence[];
  nowBucket: number;
}>): LineProviderSandboxPlanDecision {
  if (!input) return freezeDecision(evaluateLineSandboxEntryExit());
  validateLineProviderSandboxPlanSnapshot(input.snapshot);
  validateLineSandboxTransportContract(input.transport);
  if (input.credentialReferences.length !== 2 || new Set(input.credentialReferences.map((item) => item.credentialClass)).size !== input.credentialReferences.length) throw new LineSandboxPlanError("CREDENTIAL_REFERENCE_INVALID");
  for (const reference of input.credentialReferences) validateLineCredentialReference(reference);
  validateLineWebhookIngressContract(input.webhook);
  validateLineEgressAllowlistContract(input.egress);
  const tests = evaluateLineSandboxTestMatrix(input.testRecords, input.nowBucket);
  const gates = evaluateLineSandboxGates(input.gateEvidence, input.nowBucket);
  return freezeDecision(evaluateLineSandboxEntryExit({ testMatrix: tests, gates, contractsValid: true, workbenchSoleAuthority: input.snapshot.status.authority === "workbench_only" }));
}

function freezeDecision(entry: ReturnType<typeof evaluateLineSandboxEntryExit>): LineProviderSandboxPlanDecision {
  return Object.freeze({ ...entry, lifecycle: lineProviderSandboxPlanStatus.lifecycle, decision: "NO-GO", deterministic: true, productionAuthority: false, networkExecuted: false });
}
