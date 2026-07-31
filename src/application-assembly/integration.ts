import type { ModuleAccessSnapshot, TrustedModuleContext } from "./models";
import { ModuleInvocationGuard } from "./access-guard";

/** Event and Network share exactly one invocation pipeline and ordering. */
export class ApplicationModuleServiceGateway {
  constructor(private readonly guard: ModuleInvocationGuard) {}

  invokeEventMutation<T>(
    context: Omit<TrustedModuleContext, "moduleKey">,
    operation: (snapshot: ModuleAccessSnapshot) => Promise<T>,
  ): Promise<T> {
    return this.guard.invokeMutation(
      { ...context, moduleKey: "event_engine" },
      operation,
    );
  }
  invokeEventQuery<T>(
    context: Omit<TrustedModuleContext, "moduleKey">,
    operation: (snapshot: ModuleAccessSnapshot) => Promise<T>,
  ): Promise<T> {
    return this.guard.invokeQuery(
      { ...context, moduleKey: "event_engine" },
      operation,
    );
  }
  invokeBusinessNetworkMutation<T>(
    context: Omit<TrustedModuleContext, "moduleKey">,
    operation: (snapshot: ModuleAccessSnapshot) => Promise<T>,
  ): Promise<T> {
    return this.guard.invokeMutation(
      { ...context, moduleKey: "business_network_engine" },
      operation,
    );
  }
  invokeBusinessNetworkQuery<T>(
    context: Omit<TrustedModuleContext, "moduleKey">,
    operation: (snapshot: ModuleAccessSnapshot) => Promise<T>,
  ): Promise<T> {
    return this.guard.invokeQuery(
      { ...context, moduleKey: "business_network_engine" },
      operation,
    );
  }

  /** Existing callers are mutation-safe by default. */
  invokeEvent<T>(
    context: Omit<TrustedModuleContext, "moduleKey">,
    operation: (snapshot: ModuleAccessSnapshot) => Promise<T>,
  ): Promise<T> {
    return this.invokeEventMutation(context, operation);
  }
  invokeBusinessNetwork<T>(
    context: Omit<TrustedModuleContext, "moduleKey">,
    operation: (snapshot: ModuleAccessSnapshot) => Promise<T>,
  ): Promise<T> {
    return this.invokeBusinessNetworkMutation(context, operation);
  }
}
