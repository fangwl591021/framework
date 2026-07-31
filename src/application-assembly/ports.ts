import type { TrustedModuleContext } from "./models";

export interface ModuleTrafficAdmissionPort {
  admit(context: TrustedModuleContext): Promise<boolean>;
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
export class LocalAllowTrafficAdapter implements ModuleTrafficAdmissionPort {
  async admit(): Promise<boolean> {
    return true;
  }
}
export class DisabledAssemblyObservationAdapter implements AssemblyObservationPort {
  async record(): Promise<void> {}
}
