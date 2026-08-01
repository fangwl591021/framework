export const lineProviderSandboxPlanStatus = Object.freeze({
  lifecycle: "provider_sandbox_integration_plan_candidate",
  realAdapter: "disabled",
  providerExecution: "not_authorized",
  canaryExecution: "not_authorized",
  providerSandboxEntry: "not_authorized",
  providerSandboxConnectivity: "not_implemented",
  providerTransport: "fake_only",
  credentials: "not_provisioned",
  credentialReferences: "contract_only",
  publicWebhook: "not_created",
  webhookIngress: "contract_only",
  egress: "allowlist_contract_only",
  lineApiAccess: "prohibited",
  remoteD1: "not_used",
  deployment: "not_performed",
  productionUse: "not_allowed",
  authority: "workbench_only",
  decision: "NO-GO",
} as const);

export type LineSandboxPlanStatus = typeof lineProviderSandboxPlanStatus;

export type LineSandboxPlanReasonCode =
  | "PLAN_INPUT_MISSING"
  | "PLAN_SNAPSHOT_INVALID"
  | "PLAN_SNAPSHOT_UNTRUSTED"
  | "TRANSPORT_CONTRACT_INVALID"
  | "TRANSPORT_NOT_FAKE_ONLY"
  | "CREDENTIAL_REFERENCE_INVALID"
  | "CREDENTIAL_VALUE_PROHIBITED"
  | "WEBHOOK_CONTRACT_INVALID"
  | "PUBLIC_WEBHOOK_PROHIBITED"
  | "EGRESS_CONTRACT_INVALID"
  | "EGRESS_NETWORK_PROHIBITED"
  | "TEST_MATRIX_INVALID"
  | "TEST_MATRIX_INCOMPLETE"
  | "TEST_EVIDENCE_STALE"
  | "GATE_EVIDENCE_INVALID"
  | "SECURITY_GATE_MISSING"
  | "PRIVACY_GATE_MISSING"
  | "OPERATIONS_GATE_MISSING"
  | "ARCHITECTURE_GATE_MISSING"
  | "COST_GATE_MISSING"
  | "EXECUTION_GATE_MISSING"
  | "GATE_EVIDENCE_STALE"
  | "REAL_WORLD_EVIDENCE_INCOMPLETE"
  | "WORKBENCH_AUTHORITY_NOT_PRESERVED"
  | "REAL_LINE_ADAPTER_DISABLED"
  | "PROVIDER_EXECUTION_NOT_AUTHORIZED"
  | "CANARY_EXECUTION_NOT_AUTHORIZED"
  | "PROVIDER_SANDBOX_ENTRY_NOT_AUTHORIZED"
  | "PROVIDER_SANDBOX_CONNECTIVITY_NOT_IMPLEMENTED"
  | "PROVIDER_TRANSPORT_FAKE_ONLY"
  | "CREDENTIALS_NOT_PROVISIONED"
  | "PUBLIC_WEBHOOK_NOT_CREATED"
  | "LINE_API_ACCESS_PROHIBITED"
  | "REMOTE_D1_NOT_USED"
  | "DEPLOYMENT_NOT_PERFORMED"
  | "PRODUCTION_USE_NOT_ALLOWED";

export class LineSandboxPlanError extends Error {
  constructor(readonly code: Extract<LineSandboxPlanReasonCode,
    | "PLAN_SNAPSHOT_INVALID"
    | "PLAN_SNAPSHOT_UNTRUSTED"
    | "TRANSPORT_CONTRACT_INVALID"
    | "TRANSPORT_NOT_FAKE_ONLY"
    | "PUBLIC_WEBHOOK_PROHIBITED"
    | "EGRESS_NETWORK_PROHIBITED"
    | "CREDENTIAL_REFERENCE_INVALID"
    | "CREDENTIAL_VALUE_PROHIBITED"
    | "WEBHOOK_CONTRACT_INVALID"
    | "EGRESS_CONTRACT_INVALID"
    | "TEST_MATRIX_INVALID"
    | "GATE_EVIDENCE_INVALID">) {
    super(code);
    this.name = "LineSandboxPlanError";
  }
}

export interface LineProviderSandboxPlanSnapshot {
  readonly snapshotVersion: 1;
  readonly snapshotRef: string;
  readonly policyVersion: number;
  readonly createdAtBucket: number;
  readonly status: LineSandboxPlanStatus;
  readonly sourceConsolidationRef: string;
  readonly source: "trusted_repository";
}

export interface LineSandboxTransportContract {
  readonly contractVersion: 1;
  readonly transportId: "line_sandbox_transport_plan";
  readonly executionMode: "fake_only";
  readonly networkEnabled: false;
  readonly runtimeComposed: false;
  readonly providerExecutionAuthorized: false;
  readonly boundedRequestBytes: number;
  readonly boundedResponseBytes: number;
  readonly source: "trusted_repository";
}

export type LineCredentialClass = "channel_secret" | "channel_access_token";
export interface LineCredentialReferenceContract {
  readonly referenceVersion: 1;
  readonly providerKey: "line";
  readonly credentialClass: LineCredentialClass;
  readonly referenceId: string;
  readonly version: number;
  readonly environment: "provider_sandbox";
  readonly lifecycle: "planned";
  readonly containsSecretValue: false;
  readonly source: "trusted_governance";
}

export interface LineWebhookIngressContract {
  readonly contractVersion: 1;
  readonly method: "POST";
  readonly ingressMode: "contract_only";
  readonly publicRouteCreated: false;
  readonly rawBytesRequired: true;
  readonly signatureRequired: true;
  readonly replayProtectionRequired: true;
  readonly maximumBodyBytes: number;
  readonly maximumEvents: number;
  readonly acceptedContentTypes: readonly ["application/json"];
  readonly source: "trusted_repository";
}

export interface LineEgressAllowlistContract {
  readonly contractVersion: 1;
  readonly mode: "allowlist_contract_only";
  readonly networkEnabled: false;
  readonly hostReference: "line_messaging_api_host";
  readonly protocol: "https";
  readonly port: 443;
  readonly methods: readonly ["POST"];
  readonly pathReferences: readonly string[];
  readonly wildcardAllowed: false;
  readonly redirectsAllowed: false;
  readonly source: "trusted_repository";
}

export const providerFailureClasses = Object.freeze([
  "timeout", "rate_limited", "unavailable", "invalid_request", "authentication_failed",
  "permission_denied", "invalid_response", "unknown",
] as const);
export type LineProviderFailureClass = (typeof providerFailureClasses)[number];
export interface LineProviderErrorDecision {
  readonly failureClass: LineProviderFailureClass;
  readonly reasonCode: string;
  readonly retry: "never" | "bounded_after_delay" | "operator_review";
  readonly fallback: "no_execution" | "deterministic_only";
  readonly safeEvidenceClass: string;
}

export const lineSandboxTestCaseKeys = Object.freeze([
  "signature_valid", "signature_invalid", "timestamp_stale", "replay_duplicate", "payload_bounded",
  "reply_token_single_use", "credential_reference_rejected_value", "egress_exact_allowlist", "provider_error_mapping",
  "kill_switch_fail_closed", "workbench_authority", "production_isolation",
  "provider_webhook_delivery", "provider_redelivery", "provider_outage", "operational_rollback",
] as const);
export type LineSandboxTestCaseKey = (typeof lineSandboxTestCaseKeys)[number];
export interface LineSandboxTestRecord {
  readonly testCase: LineSandboxTestCaseKey;
  readonly evidenceClass: "local_control" | "real_world_prerequisite";
  readonly status: "passed" | "failed" | "not_run" | "expired";
  readonly evidenceRef: string;
  readonly verifiedAtBucket: number | null;
  readonly maximumAgeBuckets: number;
  readonly source: "trusted_repository" | "trusted_provider_sandbox";
}

export interface LineSandboxTestMatrixResult {
  readonly localControlsComplete: boolean;
  readonly realWorldPrerequisitesComplete: boolean;
  readonly missing: readonly LineSandboxTestCaseKey[];
  readonly stale: readonly LineSandboxTestCaseKey[];
  readonly failed: readonly LineSandboxTestCaseKey[];
  readonly reasonCodes: readonly LineSandboxPlanReasonCode[];
}

export const lineSandboxGateKeys = Object.freeze(["architecture", "security", "privacy", "operations", "cost", "execution"] as const);
export type LineSandboxGateKey = (typeof lineSandboxGateKeys)[number];
export interface LineSandboxGateEvidence {
  readonly gate: LineSandboxGateKey;
  readonly status: "approved" | "missing" | "expired";
  readonly evidenceRef: string;
  readonly approvedAtBucket: number | null;
  readonly maximumAgeBuckets: number;
  readonly approverRole: string;
  readonly source: "trusted_governance";
}

export interface LineSandboxGateResult {
  readonly complete: boolean;
  readonly missing: readonly LineSandboxGateKey[];
  readonly stale: readonly LineSandboxGateKey[];
  readonly reasonCodes: readonly LineSandboxPlanReasonCode[];
}

export interface LineSandboxEntryExitDecision {
  readonly entryDecision: "NO-GO";
  readonly exitDecision: "NOT_ELIGIBLE";
  readonly localPlanComplete: boolean;
  readonly realWorldPrerequisitesComplete: boolean;
  readonly reasonCodes: readonly LineSandboxPlanReasonCode[];
  readonly providerSandboxEntryAuthorized: false;
  readonly providerExecutionAuthorized: false;
  readonly canaryExecutionAuthorized: false;
  readonly productionEntryPossible: false;
}

export interface LineProviderSandboxPlanDecision extends LineSandboxEntryExitDecision {
  readonly lifecycle: "provider_sandbox_integration_plan_candidate";
  readonly decision: "NO-GO";
  readonly deterministic: true;
  readonly productionAuthority: false;
  readonly networkExecuted: false;
}
