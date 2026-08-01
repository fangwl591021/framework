import { LineProviderExecutionReadinessError, type LineSecretReferenceMetadata } from "./models";

const referencePattern = /^[a-z][a-z0-9_.:-]{2,79}$/;

export function validateLineSecretReference(reference: LineSecretReferenceMetadata): LineSecretReferenceMetadata {
  const allowedKeys = ["referenceId", "provider", "environment", "version", "status", "containsSecretValue"];
  const allowedStatuses = ["planned", "provisioned", "active", "rotating", "expired", "revoked", "unknown"];
  if (Object.keys(reference).some((key) => !allowedKeys.includes(key)) || !allowedStatuses.includes(reference.status) || reference.provider !== "line" || !referencePattern.test(reference.referenceId) || !Number.isSafeInteger(reference.version) || reference.version < 1 || reference.containsSecretValue !== false) {
    throw new LineProviderExecutionReadinessError("LINE_SECRET_REFERENCE_INVALID");
  }
  return Object.freeze({ ...reference });
}

export function validateLineSecretEnvironmentSeparation(
  staging: LineSecretReferenceMetadata,
  production: LineSecretReferenceMetadata,
): Readonly<{ valid: boolean; blockers: readonly string[] }> {
  const first = validateLineSecretReference(staging);
  const second = validateLineSecretReference(production);
  const blockers: string[] = [];
  if (first.environment !== "staging" || second.environment !== "production") blockers.push("SECRET_ENVIRONMENT_SCOPE_INVALID");
  if (first.referenceId === second.referenceId) blockers.push("SECRET_ENVIRONMENT_REFERENCE_REUSED");
  for (const reference of [first, second]) {
    if (reference.status === "expired") blockers.push(`SECRET_${reference.environment.toUpperCase()}_EXPIRED`);
    if (reference.status === "revoked") blockers.push(`SECRET_${reference.environment.toUpperCase()}_REVOKED`);
    if (reference.status === "unknown") blockers.push(`SECRET_${reference.environment.toUpperCase()}_UNKNOWN`);
  }
  return Object.freeze({ valid: blockers.length === 0, blockers: Object.freeze(blockers) });
}

export function validateLineSecretRotation(previous: LineSecretReferenceMetadata, next: LineSecretReferenceMetadata): LineSecretReferenceMetadata {
  const oldReference = validateLineSecretReference(previous);
  const newReference = validateLineSecretReference(next);
  if (oldReference.status === "revoked" || oldReference.status === "expired" || oldReference.environment !== newReference.environment || oldReference.provider !== newReference.provider || oldReference.referenceId === newReference.referenceId || newReference.version !== oldReference.version + 1) {
    throw new LineProviderExecutionReadinessError("LINE_SECRET_ROTATION_INVALID");
  }
  return newReference;
}

export function rollbackLineSecretReference(reference: LineSecretReferenceMetadata): LineSecretReferenceMetadata {
  const current = validateLineSecretReference(reference);
  return current.status === "revoked" ? current : Object.freeze({ ...current, status: "expired" as const });
}
