import type { ObservationEvent } from "./models";

export interface RetentionExecutionScope {
  readonly source: "governed_retention_executor";
  readonly scopeType: "platform" | "tenant";
  readonly tenantId: string | null;
  readonly limit: number;
}

export interface RetentionCleanupResult {
  readonly eligibleCount: number;
  readonly anonymizedCount: number;
}

export class ObservationRetentionEligibility {
  isEligible(event: ObservationEvent, now: number): boolean {
    return event.retentionStatus === "active"
      && event.retentionExpiresAt <= now;
  }

  assertExecutionScope(scope: RetentionExecutionScope): void {
    if (
      scope.source !== "governed_retention_executor"
      || !Number.isInteger(scope.limit)
      || scope.limit < 1
      || scope.limit > 100
      || (scope.scopeType === "tenant" && !scope.tenantId)
      || (scope.scopeType === "platform" && scope.tenantId !== null)
    ) {
      throw new TypeError("INVALID_RETENTION_EXECUTION_SCOPE");
    }
  }
}
