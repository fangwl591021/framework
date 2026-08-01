import { LineCanaryReadinessError, type CanaryEgressDecision, type CanaryEgressTarget } from "./models";

export const canaryEgressPolicy = Object.freeze({
  policyVersion: 1,
  mode: "decision_only",
  exactTarget: Object.freeze({ scheme: "https", hostname: "line-canary-fixture.invalid", port: 443, method: "POST" }) satisfies CanaryEgressTarget,
  redirectsRequireRevalidation: true,
  wildcardAllowed: false,
  arbitraryUrlAllowed: false,
  networkExecutionAllowed: false,
} as const);

function validHostname(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/.test(value) && !value.includes("*") && !value.startsWith(".") && !value.endsWith(".") && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function exactTarget(value: Record<string, unknown>): boolean {
  return value.scheme === canaryEgressPolicy.exactTarget.scheme
    && value.hostname === canaryEgressPolicy.exactTarget.hostname
    && value.port === canaryEgressPolicy.exactTarget.port
    && value.method === canaryEgressPolicy.exactTarget.method;
}

export function evaluateCanaryEgressEnforcement(input: unknown): CanaryEgressDecision {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new LineCanaryReadinessError("LINE_CANARY_EGRESS_INVALID");
  const value = input as Record<string, unknown>;
  const allowedKeys = ["scheme", "hostname", "port", "method", "redirectTarget", "policyVersion", "source"];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key)) || value.source !== "trusted_policy" || value.policyVersion !== canaryEgressPolicy.policyVersion || value.scheme !== "https" || typeof value.hostname !== "string" || !validHostname(value.hostname) || value.port !== 443 || value.method !== "POST") {
    throw new LineCanaryReadinessError("LINE_CANARY_EGRESS_INVALID");
  }
  if (!exactTarget(value)) return decision(false, "LINE_CANARY_EGRESS_TARGET_MISMATCH");
  if (value.redirectTarget !== null) {
    if (!value.redirectTarget || typeof value.redirectTarget !== "object" || Array.isArray(value.redirectTarget)) return decision(false, "LINE_CANARY_EGRESS_REDIRECT_MISMATCH");
    const redirect = value.redirectTarget as Record<string, unknown>;
    if (Object.keys(redirect).some((key) => !["scheme", "hostname", "port", "method"].includes(key)) || typeof redirect.hostname !== "string" || !validHostname(redirect.hostname) || !exactTarget(redirect)) return decision(false, "LINE_CANARY_EGRESS_REDIRECT_MISMATCH");
  }
  return decision(true, "LINE_CANARY_EGRESS_POLICY_MATCH");
}

function decision(policyMatched: boolean, reasonCode: string): CanaryEgressDecision {
  return Object.freeze({ policyMatched, reasonCode, enforcementMode: "decision_only", networkExecuted: false });
}
