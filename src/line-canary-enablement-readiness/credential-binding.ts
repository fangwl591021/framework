import { LineCanaryReadinessError, type CanaryCredentialBinding, type CanaryExecutionPermit } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,79}$/;

export function validateCanaryCredentialBinding(binding: CanaryCredentialBinding): CanaryCredentialBinding {
  const allowedKeys = ["bindingVersion", "bindingRef", "provider", "environment", "credentialReferenceId", "credentialVersion", "status", "containsSecretValue"];
  if (Object.keys(binding).some((key) => !allowedKeys.includes(key)) || binding.bindingVersion !== 1 || binding.provider !== "line" || !referencePattern.test(binding.bindingRef) || !referencePattern.test(binding.credentialReferenceId) || !["staging", "production"].includes(binding.environment) || !["planned", "expired", "revoked", "unknown"].includes(binding.status) || !Number.isSafeInteger(binding.credentialVersion) || binding.credentialVersion < 1 || binding.containsSecretValue !== false) {
    throw new LineCanaryReadinessError("LINE_CANARY_CREDENTIAL_BINDING_INVALID");
  }
  return Object.freeze({ ...binding });
}

export function evaluateCanaryCredentialBindings(
  staging: CanaryCredentialBinding,
  production: CanaryCredentialBinding,
  permit: CanaryExecutionPermit,
): Readonly<{ candidate: boolean; blockers: readonly string[] }> {
  const first = validateCanaryCredentialBinding(staging);
  const second = validateCanaryCredentialBinding(production);
  const blockers: string[] = [];
  if (first.environment !== "staging" || second.environment !== "production") blockers.push("CANARY_CREDENTIAL_ENVIRONMENT_INVALID");
  if (first.credentialReferenceId === second.credentialReferenceId || first.bindingRef === second.bindingRef) blockers.push("CANARY_CREDENTIAL_ENVIRONMENT_REUSED");
  for (const binding of [first, second]) {
    if (binding.status === "expired") blockers.push(`CANARY_CREDENTIAL_${binding.environment.toUpperCase()}_EXPIRED`);
    if (binding.status === "revoked") blockers.push(`CANARY_CREDENTIAL_${binding.environment.toUpperCase()}_REVOKED`);
    if (binding.status === "unknown") blockers.push(`CANARY_CREDENTIAL_${binding.environment.toUpperCase()}_UNKNOWN`);
  }
  const selected = permit.environment === "staging" ? first : second;
  if (permit.credentialReferenceId !== selected.credentialReferenceId || permit.credentialVersion !== selected.credentialVersion) blockers.push("CANARY_PERMIT_CREDENTIAL_VERSION_MISMATCH");
  return Object.freeze({ candidate: blockers.length === 0, blockers: Object.freeze(blockers) });
}

export function rollbackCanaryCredentialBinding(binding: CanaryCredentialBinding): CanaryCredentialBinding {
  const current = validateCanaryCredentialBinding(binding);
  return current.status === "revoked" ? current : Object.freeze({ ...current, status: "expired" as const });
}
