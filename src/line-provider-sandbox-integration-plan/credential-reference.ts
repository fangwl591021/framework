import { LineSandboxPlanError, type LineCredentialClass, type LineCredentialReferenceContract } from "./models";

const referencePattern = /^secret-ref:[a-z][a-z0-9_-]{2,47}$/;

export function createPlannedLineCredentialReference(credentialClass: LineCredentialClass, referenceId: string, version: number): LineCredentialReferenceContract {
  const value: LineCredentialReferenceContract = { referenceVersion: 1, providerKey: "line", credentialClass, referenceId, version, environment: "provider_sandbox", lifecycle: "planned", containsSecretValue: false, source: "trusted_governance" };
  return validateLineCredentialReference(value);
}

export function validateLineCredentialReference(reference: LineCredentialReferenceContract): LineCredentialReferenceContract {
  const keys = ["referenceVersion", "providerKey", "credentialClass", "referenceId", "version", "environment", "lifecycle", "containsSecretValue", "source"];
  const suppliedKeys = Object.keys(reference);
  if (suppliedKeys.some((key) => ["value", "secret", "token", "credential", "authorization"].includes(key.toLowerCase()))) throw new LineSandboxPlanError("CREDENTIAL_VALUE_PROHIBITED");
  if (suppliedKeys.some((key) => !keys.includes(key)) || reference.referenceVersion !== 1 || reference.providerKey !== "line" ||
      !["channel_secret", "channel_access_token"].includes(reference.credentialClass) || !referencePattern.test(reference.referenceId) ||
      !Number.isSafeInteger(reference.version) || reference.version < 1 || reference.environment !== "provider_sandbox" ||
      reference.lifecycle !== "planned" || reference.containsSecretValue !== false || reference.source !== "trusted_governance") {
    throw new LineSandboxPlanError("CREDENTIAL_REFERENCE_INVALID");
  }
  return Object.freeze({ ...reference });
}
