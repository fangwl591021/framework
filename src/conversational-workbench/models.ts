export type ConversationStatus =
  | "active"
  | "waiting_for_input"
  | "waiting_for_confirmation"
  | "processing"
  | "completed"
  | "cancelled"
  | "expired";
export type WorkbenchResponseStatus =
  | "understood"
  | "clarification_required"
  | "action_required"
  | "confirmation_required"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";
export type RiskLevel = "read" | "low" | "elevated" | "high";
export type ConfirmationPolicy =
  | "none"
  | "summary_confirmation"
  | "explicit_confirmation"
  | "second_factor_required_future";
export type SlotType =
  | "string"
  | "integer"
  | "boolean"
  | "date"
  | "datetime"
  | "enum"
  | "application_reference"
  | "module_reference"
  | "support_code";

export interface TrustedConversationContext {
  readonly source: "trusted_runtime_context";
  readonly tenantId: string;
  readonly applicationId: string;
  readonly actorMembershipId: string;
  readonly channelKey: string;
  readonly correlationId: string;
}

export interface IntentDefinition {
  readonly intentKey: string;
  readonly displayName: string;
  readonly moduleKey: string;
  readonly operationKey: string;
  readonly intentVersion: number;
  readonly requiredPermission: string;
  readonly riskLevel: RiskLevel;
  readonly requiredSlots: readonly string[];
  readonly optionalSlots: readonly string[];
  readonly confirmationPolicy: ConfirmationPolicy;
  readonly responseTemplateKey: string;
  readonly status: "active" | "retired";
}

export interface IntentResolutionResult {
  readonly status:
    | "resolved"
    | "ambiguous"
    | "unsupported"
    | "security_rejected";
  readonly intentKey: string | null;
  readonly confidence: number;
  readonly choices: readonly string[];
  readonly reasonCode: string;
}

export interface SlotDefinition {
  readonly slotKey: string;
  readonly type: SlotType;
  readonly label: string;
  readonly required: boolean;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly maximumLength?: number;
  readonly values?: readonly string[];
  readonly sensitive?: boolean;
}

export interface ConversationSession {
  readonly id: string;
  readonly tenantId: string;
  readonly applicationId: string;
  readonly actorMembershipId: string;
  readonly channelKey: string;
  readonly status: ConversationStatus;
  readonly activeIntentKey: string | null;
  readonly currentStepKey: string | null;
  readonly version: number;
  readonly expiresAt: number;
}

export interface OperationPlan {
  readonly id: string;
  readonly tenantId: string;
  readonly applicationId: string;
  readonly conversationId: string;
  readonly planVersion: number;
  readonly intentKey: string;
  readonly intentVersion: number;
  readonly moduleKey: string;
  readonly operationKey: string;
  readonly safeParameterDigest: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly riskLevel: RiskLevel;
  readonly confirmationRequired: boolean;
  readonly confirmationStatus:
    | "not_required"
    | "pending"
    | "approved"
    | "rejected";
  readonly accessSnapshotReference: string;
  readonly idempotencyKey: string;
  readonly status:
    | "prepared"
    | "awaiting_confirmation"
    | "approved"
    | "executing"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "expired";
  readonly version: number;
  readonly expiresAt: number;
}

export interface WorkbenchResponse {
  readonly responseId: string;
  readonly conversationId: string;
  readonly status: WorkbenchResponseStatus;
  readonly message: string;
  readonly supportCode: string | null;
  readonly actionRequired: boolean;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
  readonly choices: readonly string[];
  readonly summary: Readonly<Record<string, unknown>> | null;
  readonly operationReceipt: string | null;
  readonly presentationPayload: Readonly<Record<string, unknown>>;
}

export interface WorkbenchInput {
  readonly messageKey: string;
  readonly text: string;
  readonly slots?: Readonly<Record<string, unknown>>;
}

export interface OperationInvocation {
  readonly context: TrustedConversationContext;
  readonly plan: OperationPlan;
  readonly intent: IntentDefinition;
}

export interface OperationResult {
  readonly message: string;
  readonly receipt: string;
  readonly summary: Readonly<Record<string, unknown>>;
}

export class WorkbenchError extends Error {
  constructor(
    readonly code:
      | "UNTRUSTED_CONTEXT"
      | "CONVERSATION_PERMISSION_DENIED"
      | "CONVERSATION_TERMINAL"
      | "MESSAGE_CONFLICT"
      | "INTENT_NOT_ALLOWED"
      | "INVALID_SLOT"
      | "PLAN_EXPIRED"
      | "PLAN_STALE"
      | "CONFIRMATION_REQUIRED"
      | "CONFIRMATION_AMBIGUOUS"
      | "OPERATION_NOT_ALLOWED"
      | "OPERATION_ALREADY_COMPLETED"
      | "TENANT_BOUNDARY"
      | "TRAFFIC_REJECTED"
      | "SERVICE_DEGRADED",
  ) {
    super(code);
    this.name = "WorkbenchError";
  }
}
