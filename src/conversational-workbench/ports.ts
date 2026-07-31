import type {
  ModuleTrafficAdmissionPort,
  TrustedModuleContext,
} from "../application-assembly";
import type {
  IntentDefinition,
  OperationInvocation,
  OperationResult,
  TrustedConversationContext,
} from "./models";
import { WorkbenchError } from "./models";

export interface WorkbenchAuthorizationPort {
  hasPermission(
    tenantId: string,
    membershipId: string,
    permissionKey: string,
  ): Promise<boolean>;
}
export interface WorkbenchApplicationStatePort {
  isActive(tenantId: string, applicationId: string): Promise<boolean>;
}
export interface WorkbenchObservationPort {
  record(
    event: Readonly<{
      eventType: string;
      tenantId: string;
      applicationId: string;
      operation: string;
      reasonCode: string;
    }>,
  ): Promise<void>;
}
export interface WorkbenchOperationAdapter {
  readonly moduleKey: string;
  readonly operations: readonly string[];
  invoke(invocation: OperationInvocation): Promise<OperationResult>;
}
export interface PlatformServiceInvocationPort {
  invoke<T>(
    context: TrustedConversationContext,
    intent: IntentDefinition,
    operation: () => Promise<T>,
  ): Promise<T>;
}

export class TrafficAuthorizedPlatformInvocation
  implements PlatformServiceInvocationPort
{
  constructor(
    private readonly traffic: ModuleTrafficAdmissionPort,
    private readonly applications: WorkbenchApplicationStatePort,
    private readonly authorization: WorkbenchAuthorizationPort,
  ) {}
  async invoke<T>(
    context: TrustedConversationContext,
    intent: IntentDefinition,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (context.source !== "trusted_runtime_context")
      throw new WorkbenchError("UNTRUSTED_CONTEXT");
    const trafficContext: TrustedModuleContext = {
      source: "trusted_runtime_context",
      tenantId: context.tenantId,
      applicationId: context.applicationId,
      moduleKey: intent.moduleKey,
      actorMembershipId: context.actorMembershipId,
      requiredPermission: intent.requiredPermission,
      operation: intent.operationKey,
      correlationId: context.correlationId,
    };
    const lease = await this.traffic.admit(trafficContext);
    let released = false;
    const release = async () => {
      if (released) return;
      released = true;
      try {
        await lease.release();
      } catch {
        /* admission adapter owns safe failure evidence */
      }
    };
    if (!lease.admitted) {
      await release();
      throw new WorkbenchError("TRAFFIC_REJECTED");
    }
    try {
      if (
        !(await this.applications.isActive(
          context.tenantId,
          context.applicationId,
        ))
      )
        throw new WorkbenchError("PLAN_STALE");
      if (
        !(await this.authorization.hasPermission(
          context.tenantId,
          context.actorMembershipId,
          intent.requiredPermission,
        ))
      )
        throw new WorkbenchError("CONVERSATION_PERMISSION_DENIED");
      return await operation();
    } finally {
      await release();
    }
  }
}

export class DisabledWorkbenchObservationAdapter
  implements WorkbenchObservationPort
{
  async record(): Promise<void> {}
}
