import type { OperationInvocation, OperationResult } from "./models";
import { WorkbenchError } from "./models";
import type { WorkbenchOperationAdapter } from "./ports";

export class AllowlistedOperationRouter {
  private readonly routes = new Map<string, WorkbenchOperationAdapter>();
  constructor(adapters: readonly WorkbenchOperationAdapter[]) {
    for (const adapter of adapters)
      for (const operation of adapter.operations) {
        if (this.routes.has(operation))
          throw new TypeError(`duplicate operation route: ${operation}`);
        this.routes.set(operation, adapter);
      }
  }
  async execute(invocation: OperationInvocation): Promise<OperationResult> {
    if (
      invocation.intent.operationKey !== invocation.plan.operationKey ||
      invocation.intent.moduleKey !== invocation.plan.moduleKey
    )
      throw new WorkbenchError("OPERATION_NOT_ALLOWED");
    const adapter = this.routes.get(invocation.plan.operationKey);
    if (!adapter || adapter.moduleKey !== invocation.plan.moduleKey)
      throw new WorkbenchError("OPERATION_NOT_ALLOWED");
    return adapter.invoke(invocation);
  }
  registeredOperations(): readonly string[] {
    return Object.freeze([...this.routes.keys()].sort());
  }
}
