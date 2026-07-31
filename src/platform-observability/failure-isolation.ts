import type { Clock } from "../core/clock";

export interface ObservabilityFailureEvidence {
  readonly correlationId: string;
  readonly operation: string;
  readonly reasonCode:
    | "OBSERVATION_WRITE_FAILED"
    | "INCIDENT_AGGREGATION_DEFERRED"
    | "ALERT_SIDE_EFFECT_FAILED";
  readonly occurredAt: number;
  readonly occurrenceCount: 1;
}

export interface ObservabilityFailureEvidencePort {
  record(evidence: ObservabilityFailureEvidence): Promise<void>;
}

export interface IncidentAggregationGuardPort {
  assertAvailable(observationEventId: string): Promise<void>;
}

export class AvailableIncidentAggregationGuard
implements IncidentAggregationGuardPort {
  async assertAvailable(_observationEventId: string): Promise<void> {
    return Promise.resolve();
  }
}

export class LocalObservabilityFailureEvidenceAdapter
implements ObservabilityFailureEvidencePort {
  private readonly captured: ObservabilityFailureEvidence[] = [];

  get evidence(): readonly ObservabilityFailureEvidence[] {
    return this.captured;
  }

  async record(evidence: ObservabilityFailureEvidence): Promise<void> {
    this.captured.push(Object.freeze({ ...evidence }));
  }
}

export class ObservabilitySidecar {
  constructor(
    private readonly clock: Clock,
    private readonly fallback: ObservabilityFailureEvidencePort,
  ) {}

  async afterSuccessfulOperation<T>(
    businessResult: T,
    input: Readonly<{
      correlationId: string;
      operation: string;
      observe: () => Promise<void>;
    }>,
  ): Promise<T> {
    await this.run(input);
    return businessResult;
  }

  scheduleAfterSuccessfulOperation<T>(
    businessResult: T,
    executionContext: ExecutionContext,
    input: Readonly<{
      correlationId: string;
      operation: string;
      observe: () => Promise<void>;
    }>,
  ): T {
    executionContext.waitUntil(this.run(input));
    return businessResult;
  }

  private async run(input: Readonly<{
    correlationId: string;
    operation: string;
    observe: () => Promise<void>;
  }>): Promise<void> {
    assertSafeReference(input.correlationId, 255);
    assertSafeReference(input.operation, 100);
    try {
      await input.observe();
    } catch {
      try {
        await this.fallback.record(Object.freeze({
          correlationId: input.correlationId,
          operation: input.operation,
          reasonCode: "OBSERVATION_WRITE_FAILED",
          occurredAt: this.clock.now().getTime(),
          occurrenceCount: 1,
        }));
      } catch {
        // A sidecar fallback remains isolated from the completed operation.
      }
    }
  }
}

function assertSafeReference(value: string, max: number): void {
  if (
    !value.trim()
    || value.length > max
    || /(authorization|cookie|secret|token|stack|select\s|insert\s|request.?body)/i
      .test(value)
  ) {
    throw new TypeError("Unsafe observability failure reference");
  }
}
