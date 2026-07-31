import type { TrustedModuleContext } from "./models";
import { ModuleAccessGuard } from "./access-guard";

/** Optional domain services are resolved internally after a trusted gate. */
export class ApplicationModuleServiceGateway {
  constructor(private readonly guard: ModuleAccessGuard) {}
  async invokeEvent<T>(
    context: Omit<TrustedModuleContext, "moduleKey">,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.invoke({ ...context, moduleKey: "event_engine" }, operation);
  }
  async invokeBusinessNetwork<T>(
    context: Omit<TrustedModuleContext, "moduleKey">,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.invoke(
      { ...context, moduleKey: "business_network_engine" },
      operation,
    );
  }
  private async invoke<T>(
    context: TrustedModuleContext,
    operation: () => Promise<T>,
  ): Promise<T> {
    await this.guard.assertAccess(context);
    return operation();
  }
}
