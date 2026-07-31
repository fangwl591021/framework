import type { ModuleAccessSnapshot, TrustedModuleContext } from "./models";

export interface TrafficAdmissionLease {
  readonly admitted: boolean;
  release(): Promise<void>;
}

/**
 * Adapts PR #20 admission stages 2-7. It must verify signature/identity and
 * webhook deduplication when applicable, then claim rate/resource/circuit/
 * backpressure admission exactly once. Module and permission checks follow.
 */
export interface ModuleTrafficAdmissionPort {
  admit(context: TrustedModuleContext): Promise<TrafficAdmissionLease>;
}

export interface ModuleEligibilityPort {
  requireEligible(context: TrustedModuleContext): Promise<ModuleAccessSnapshot>;
  isSnapshotCurrent(snapshot: ModuleAccessSnapshot): Promise<boolean>;
}

export interface AssemblyObservationPort {
  record(
    event: Readonly<{
      eventType: string;
      tenantId: string;
      applicationId: string;
      moduleKey: string;
      reasonCode: string;
    }>,
  ): Promise<void>;
}

/** Local-test-only adapter. Production composition must bind PR #20 admission. */
export class LocalAllowTrafficAdapter implements ModuleTrafficAdmissionPort {
  async admit(): Promise<TrafficAdmissionLease> {
    let released = false;
    return {
      admitted: true,
      release: async () => {
        if (released) return;
        released = true;
      },
    };
  }
}

export class DisabledAssemblyObservationAdapter implements AssemblyObservationPort {
  async record(): Promise<void> {}
}
