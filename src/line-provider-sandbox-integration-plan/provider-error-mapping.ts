import { LineSandboxPlanError, providerFailureClasses, type LineProviderErrorDecision, type LineProviderFailureClass } from "./models";

const decisions: Readonly<Record<LineProviderFailureClass, LineProviderErrorDecision>> = Object.freeze({
  timeout: Object.freeze({ failureClass: "timeout", reasonCode: "PROVIDER_TIMEOUT", retry: "bounded_after_delay", fallback: "deterministic_only", safeEvidenceClass: "provider_timeout" }),
  rate_limited: Object.freeze({ failureClass: "rate_limited", reasonCode: "PROVIDER_RATE_LIMITED", retry: "bounded_after_delay", fallback: "no_execution", safeEvidenceClass: "provider_rate_limited" }),
  unavailable: Object.freeze({ failureClass: "unavailable", reasonCode: "PROVIDER_UNAVAILABLE", retry: "bounded_after_delay", fallback: "deterministic_only", safeEvidenceClass: "provider_unavailable" }),
  invalid_request: Object.freeze({ failureClass: "invalid_request", reasonCode: "PROVIDER_REQUEST_REJECTED", retry: "never", fallback: "no_execution", safeEvidenceClass: "provider_request_rejected" }),
  authentication_failed: Object.freeze({ failureClass: "authentication_failed", reasonCode: "PROVIDER_AUTHENTICATION_FAILED", retry: "operator_review", fallback: "no_execution", safeEvidenceClass: "provider_authentication_failed" }),
  permission_denied: Object.freeze({ failureClass: "permission_denied", reasonCode: "PROVIDER_PERMISSION_DENIED", retry: "operator_review", fallback: "no_execution", safeEvidenceClass: "provider_permission_denied" }),
  invalid_response: Object.freeze({ failureClass: "invalid_response", reasonCode: "PROVIDER_RESPONSE_INVALID", retry: "never", fallback: "deterministic_only", safeEvidenceClass: "provider_response_invalid" }),
  unknown: Object.freeze({ failureClass: "unknown", reasonCode: "PROVIDER_FAILURE_UNKNOWN", retry: "operator_review", fallback: "no_execution", safeEvidenceClass: "provider_failure_unknown" }),
});

export function mapLineProviderFailure(failureClass: LineProviderFailureClass): LineProviderErrorDecision {
  if (!providerFailureClasses.includes(failureClass)) throw new LineSandboxPlanError("TRANSPORT_CONTRACT_INVALID");
  return decisions[failureClass];
}
