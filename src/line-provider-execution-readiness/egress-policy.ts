import { LineProviderExecutionReadinessError, type LineEgressDecision, type LineEgressRequest, type LineEgressTarget } from "./models";

export const lineEgressPolicy = Object.freeze({
  policyVersion: 1,
  mode: "policy_only",
  allowedTarget: Object.freeze({ scheme: "https", hostname: "line-provider-fixture.invalid", port: 443, method: "POST" }) satisfies LineEgressTarget,
  wildcardAllowed: false,
  arbitraryUrlAllowed: false,
  redirectsRequireExactAllowlistMatch: true,
  dnsAuthority: false,
  ipAuthority: false,
  networkExecutionAllowed: false,
} as const);

function validHostname(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/.test(value) && !value.includes("*") && !value.startsWith(".") && !value.endsWith(".") && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function targetMatches(value: LineEgressTarget): boolean {
  return value.scheme === lineEgressPolicy.allowedTarget.scheme
    && value.hostname === lineEgressPolicy.allowedTarget.hostname
    && value.port === lineEgressPolicy.allowedTarget.port
    && value.method === lineEgressPolicy.allowedTarget.method;
}

export function evaluateLineEgress(input: unknown): LineEgressDecision {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new LineProviderExecutionReadinessError("LINE_EGRESS_POLICY_INVALID");
  const value = input as Record<string, unknown>;
  const allowedKeys = ["scheme", "hostname", "port", "method", "redirectTarget", "source"];
  if (Object.keys(value).some((key) => !allowedKeys.includes(key)) || value.source !== "trusted_policy" || value.scheme !== "https" || typeof value.hostname !== "string" || !validHostname(value.hostname) || value.port !== 443 || value.method !== "POST") {
    throw new LineProviderExecutionReadinessError("LINE_EGRESS_POLICY_INVALID");
  }
  const request = value as unknown as LineEgressRequest;
  if (!targetMatches(request)) return Object.freeze({ allowedByPolicy: false, reasonCode: "LINE_EGRESS_TARGET_NOT_ALLOWLISTED", networkExecuted: false, dnsAuthority: false, ipAuthority: false });
  if (request.redirectTarget !== null) {
    if (!request.redirectTarget || typeof request.redirectTarget !== "object" || !validHostname(request.redirectTarget.hostname) || !targetMatches(request.redirectTarget)) {
      return Object.freeze({ allowedByPolicy: false, reasonCode: "LINE_EGRESS_REDIRECT_NOT_ALLOWLISTED", networkExecuted: false, dnsAuthority: false, ipAuthority: false });
    }
  }
  return Object.freeze({ allowedByPolicy: true, reasonCode: "LINE_EGRESS_POLICY_MATCH", networkExecuted: false, dnsAuthority: false, ipAuthority: false });
}
