import type {
  FailureClassification,
  FailureClassificationInput,
  FailureCategory,
} from "./models";

const CLASSIFICATION_BY_CODE: Readonly<Record<string, FailureCategory>> =
  Object.freeze({
    INPUT_INCOMPLETE: "USER_INPUT_INCOMPLETE",
    INVALID_REQUEST: "USER_INPUT_INVALID",
    VALIDATION_FAILED: "USER_INPUT_INVALID",
    PERMISSION_DENIED: "PERMISSION_DENIED",
    MODULE_NOT_ENABLED: "MODULE_NOT_ENABLED",
    MODULE_NOT_ENTITLED: "MODULE_NOT_ENABLED",
    TENANT_CONFIGURATION_INVALID: "TENANT_CONFIGURATION_ERROR",
    APPLICATION_CONFIGURATION_INVALID: "APPLICATION_CONFIGURATION_ERROR",
    PROVIDER_DEGRADED: "EXTERNAL_PROVIDER_DEGRADED",
    PROVIDER_UNAVAILABLE: "EXTERNAL_PROVIDER_UNAVAILABLE",
    DATABASE_OPERATION_FAILED: "DATABASE_OPERATION_FAILED",
    RELEASE_HEALTH_FAILED: "RELEASE_HEALTH_FAILED",
    BACKUP_FAILED: "BACKUP_OR_RESTORE_FAILED",
    RESTORE_FAILED: "BACKUP_OR_RESTORE_FAILED",
    INTERNAL_ERROR: "PLATFORM_INTERNAL_ERROR",
  });

export class FailureClassifier {
  classify(input: FailureClassificationInput): FailureClassification {
    let category = CLASSIFICATION_BY_CODE[input.errorCode] ?? "UNKNOWN_FAILURE";
    if (input.validationState === "incomplete") {
      category = "USER_INPUT_INCOMPLETE";
    } else if (input.validationState === "invalid") {
      category = "USER_INPUT_INVALID";
    } else if (input.dependencyStatus === "degraded") {
      category = "EXTERNAL_PROVIDER_DEGRADED";
    } else if (input.dependencyStatus === "unavailable") {
      category = "EXTERNAL_PROVIDER_UNAVAILABLE";
    } else if (input.releaseHealthy === false) {
      category = "RELEASE_HEALTH_FAILED";
    }

    const retryable = [
      "EXTERNAL_PROVIDER_DEGRADED",
      "EXTERNAL_PROVIDER_UNAVAILABLE",
      "DATABASE_OPERATION_FAILED",
      "PLATFORM_INTERNAL_ERROR",
      "RELEASE_HEALTH_FAILED",
      "BACKUP_OR_RESTORE_FAILED",
      "UNKNOWN_FAILURE",
    ].includes(category);
    const actionRequired = [
      "USER_INPUT_INCOMPLETE",
      "USER_INPUT_INVALID",
      "PERMISSION_DENIED",
      "MODULE_NOT_ENABLED",
      "TENANT_CONFIGURATION_ERROR",
      "APPLICATION_CONFIGURATION_ERROR",
    ].includes(category);

    return Object.freeze({
      category,
      retryable,
      actionRequired,
      suggestedAction: suggestedAction(category),
    });
  }
}

function suggestedAction(category: FailureCategory): string {
  switch (category) {
    case "USER_INPUT_INCOMPLETE":
      return "Provide the missing required information.";
    case "USER_INPUT_INVALID":
      return "Correct the invalid information and submit again.";
    case "PERMISSION_DENIED":
      return "Ask an administrator to review your access.";
    case "MODULE_NOT_ENABLED":
      return "Ask an administrator to enable the required module.";
    case "TENANT_CONFIGURATION_ERROR":
    case "APPLICATION_CONFIGURATION_ERROR":
      return "Review the safe configuration checklist.";
    case "EXTERNAL_PROVIDER_DEGRADED":
    case "EXTERNAL_PROVIDER_UNAVAILABLE":
      return "Retry later without submitting duplicate work.";
    case "RELEASE_HEALTH_FAILED":
    case "BACKUP_OR_RESTORE_FAILED":
      return "Follow the platform recovery runbook.";
    default:
      return "Use the Support Code when contacting platform support.";
  }
}

export interface RootCauseAnalysisPort {
  analyze(
    classification: FailureClassification,
    safeEvidence: Readonly<Record<string, string | number | boolean | null>>,
  ): Promise<Readonly<{ summary: string; suggestedAction: string }>>;
}

export class DisabledAiRootCauseAdapter implements RootCauseAnalysisPort {
  async analyze(
    _classification: FailureClassification,
    _safeEvidence: Readonly<Record<string, string | number | boolean | null>>,
  ): Promise<never> {
    throw new Error("AI_ROOT_CAUSE_PROVIDER_DISABLED");
  }
}
