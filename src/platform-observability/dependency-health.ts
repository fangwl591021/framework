import type { Clock } from "../core/clock";
import type {
  DependencyDefinition,
  DependencyHealthResult,
  DependencyHealthSnapshot,
  DependencyStatus,
} from "./models";

export interface DependencyHealthProbePort {
  readonly dependencyKey: string;
  probe(): Promise<Readonly<{
    status: DependencyStatus;
    reasonCode: string;
  }>>;
}

export class DependencyRegistry {
  private readonly definitions = new Map<string, DependencyDefinition>();

  register(definition: DependencyDefinition): void {
    if (
      !/^[a-z0-9][a-z0-9._-]{1,79}$/.test(definition.dependencyKey)
      || this.definitions.has(definition.dependencyKey)
    ) {
      throw new TypeError("Invalid or duplicate dependency");
    }
    this.definitions.set(definition.dependencyKey, Object.freeze({ ...definition }));
  }

  list(): readonly DependencyDefinition[] {
    return Object.freeze([...this.definitions.values()]);
  }
}

export class DependencyStatusAggregator {
  constructor(
    private readonly clock: Clock,
    private readonly registry: DependencyRegistry,
    private readonly probes: readonly DependencyHealthProbePort[],
  ) {}

  async snapshot(): Promise<DependencyHealthSnapshot> {
    const definitions = this.registry.list();
    const probes = new Map(this.probes.map((probe) => [probe.dependencyKey, probe]));
    const checkedAt = this.clock.now().getTime();
    const results: DependencyHealthResult[] = [];

    for (const definition of definitions) {
      const probe = probes.get(definition.dependencyKey);
      let result: Readonly<{ status: DependencyStatus; reasonCode: string }>;
      try {
        result = probe
          ? await probe.probe()
          : { status: "unknown", reasonCode: "PROBE_NOT_REGISTERED" };
      } catch {
        result = { status: "unavailable", reasonCode: "PROBE_FAILED" };
      }
      results.push(Object.freeze({
        dependencyKey: definition.dependencyKey,
        status: result.status,
        reasonCode: boundedReason(result.reasonCode),
        checkedAt,
      }));
    }

    const requiredUnavailableCount = definitions.filter((definition) => {
      const result = results.find(
        ({ dependencyKey }) => dependencyKey === definition.dependencyKey,
      );
      return definition.required && (
        result?.status === "unavailable" || result?.status === "unknown"
      );
    }).length;
    const optionalDegradedCount = definitions.filter((definition) => {
      const result = results.find(
        ({ dependencyKey }) => dependencyKey === definition.dependencyKey,
      );
      return !definition.required && result?.status !== "healthy";
    }).length;

    return Object.freeze({
      ready: requiredUnavailableCount === 0,
      checkedAt,
      requiredUnavailableCount,
      optionalDegradedCount,
      results: Object.freeze(results),
    });
  }
}

export class StaticDependencyProbe implements DependencyHealthProbePort {
  constructor(
    readonly dependencyKey: string,
    private readonly status: DependencyStatus,
    private readonly reasonCode: string,
  ) {}

  async probe(): Promise<Readonly<{ status: DependencyStatus; reasonCode: string }>> {
    return Object.freeze({
      status: this.status,
      reasonCode: boundedReason(this.reasonCode),
    });
  }
}

export class DisabledDependencyProbe extends StaticDependencyProbe {
  constructor(dependencyKey: string) {
    super(dependencyKey, "unavailable", "PROVIDER_DISABLED");
  }
}

function boundedReason(reasonCode: string): string {
  if (!/^[A-Z0-9_]{2,80}$/.test(reasonCode)) {
    throw new TypeError("Invalid dependency reason code");
  }
  return reasonCode;
}
