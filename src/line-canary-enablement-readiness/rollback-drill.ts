import { LineCanaryReadinessError, type CanaryCredentialBinding, type CanaryDrillDecision } from "./models";
import { validateCanaryCredentialBinding } from "./credential-binding";

const rollbackRoles = Object.freeze(["platform_operator", "security_operator", "incident_commander", "release_manager"] as const);

export function runCanaryRollbackDrill(input: Readonly<{
  actorRole: string;
  providerAvailable: boolean;
  credential: CanaryCredentialBinding;
  evidenceWriterAvailable: boolean;
  planValidated: boolean;
}>): CanaryDrillDecision {
  if (!(rollbackRoles as readonly string[]).includes(input.actorRole)) throw new LineCanaryReadinessError("LINE_CANARY_ROLLBACK_AUTHORITY_INVALID");
  if (!input.planValidated) return drill(false, "LINE_CANARY_ROLLBACK_PLAN_INVALID");
  if (input.credential.status === "revoked") return drill(true, "LINE_CANARY_ROLLBACK_REVOKED_CREDENTIAL_PRESERVED");
  return drill(true, input.evidenceWriterAvailable ? "LINE_CANARY_ROLLBACK_DRILL_PASSED" : "LINE_CANARY_ROLLBACK_PASSED_EVIDENCE_DEGRADED");
}

export function runCanaryCredentialRevocationDrill(binding: CanaryCredentialBinding): Readonly<{ passed: true; resultingStatus: "revoked"; restored: false; mutationPerformed: false; networkExecuted: false }> {
  validateCanaryCredentialBinding(binding);
  return Object.freeze({ passed: true, resultingStatus: "revoked", restored: false, mutationPerformed: false, networkExecuted: false });
}

function drill(passed: boolean, reasonCode: string): CanaryDrillDecision {
  return Object.freeze({ passed, resultingAdapterState: "disabled", resultingTransport: "fake_only", reasonCode, providerDependencyRequired: false, credentialDependencyRequired: false, mutationPerformed: false, networkExecuted: false });
}
