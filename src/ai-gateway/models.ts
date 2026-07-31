export const AI_GATEWAY_MODULE_KEY = "ai-gateway";

export type AiTaskKey =
  | "workbench.intent_resolution"
  | "workbench.clarification_suggestion"
  | "diagnostics.safe_summary"
  | "content.safe_rewrite"
  | "content.translation";

export interface TrustedAiContext {
  readonly source: "trusted_runtime_context";
  readonly tenantId: string;
  readonly applicationId: string;
  readonly actorMembershipId: string;
  readonly correlationId: string;
  readonly permissionGranted: boolean;
  readonly moduleEnabled: boolean;
  readonly trafficAdmitted: boolean;
}

export interface PrepareAiRequestInput {
  readonly context: TrustedAiContext;
  readonly taskKey: AiTaskKey;
  readonly taskVersion: 1;
  readonly input: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly locale: string;
  readonly qualityTier: "deterministic" | "standard" | "high";
  readonly cacheDirective: "allow" | "bypass";
  readonly requestedOutputUnits: number;
  readonly requestedCostMicros: number;
}

export interface PreparedAiRequest {
  readonly requestId: string;
  readonly status: "prepared" | "processing" | "completed" | "rejected" | "failed";
  readonly replayed: boolean;
  readonly storedResult: Readonly<Record<string, unknown>> | null;
  readonly inputDigest: string;
}

export interface AiRoute {
  readonly providerKey: string;
  readonly modelKey: string;
  readonly modelVersion: string;
}

export interface AiProviderRequest {
  readonly taskKey: AiTaskKey;
  readonly taskVersion: 1;
  readonly input: Readonly<Record<string, unknown>>;
  readonly locale: string;
  readonly maxOutputUnits: number;
  readonly timeoutMs: number;
}

export interface AiProviderResult {
  readonly output: Readonly<Record<string, unknown>>;
  readonly inputUnits: number;
  readonly outputUnits: number;
  readonly latencyMs: number;
}

export interface ValidatedAiOutput {
  readonly output: Readonly<Record<string, unknown>>;
  readonly confidence: number;
  readonly requiresClarification: boolean;
}

export type AiGatewayErrorCode =
  | "AI_UNTRUSTED_CONTEXT"
  | "AI_TRAFFIC_REJECTED"
  | "AI_MODULE_NOT_ENABLED"
  | "AI_PERMISSION_DENIED"
  | "AI_TASK_NOT_AVAILABLE"
  | "AI_POLICY_NOT_AVAILABLE"
  | "AI_BUDGET_EXCEEDED"
  | "AI_PROVIDER_DISABLED"
  | "AI_PROVIDER_FAILED"
  | "AI_OUTPUT_INVALID"
  | "AI_IDEMPOTENCY_CONFLICT"
  | "AI_INPUT_REJECTED";

export class AiGatewayError extends Error {
  constructor(readonly code: AiGatewayErrorCode) {
    super(code);
    this.name = "AiGatewayError";
  }
}

export interface AiUsageSummary {
  readonly requests: number;
  readonly inputUnits: number;
  readonly outputUnits: number;
  readonly estimatedCostMicros: number;
}
