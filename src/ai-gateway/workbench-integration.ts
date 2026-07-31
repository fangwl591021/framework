import type { IntentResolutionResult } from "../conversational-workbench/models";
import type { IntentResolverPort } from "../conversational-workbench/resolver";
import type { AiGatewayService } from "./application";
import type { TrustedAiContext } from "./models";

export type WorkbenchAiMode = "deterministic_only" | "gateway_shadow" | "gateway_enabled_future";

/** Shadow comparison can produce local evidence, but never changes the formal deterministic result. */
export class AiGatewayWorkbenchIntentResolver implements IntentResolverPort {
  constructor(
    private readonly deterministic: IntentResolverPort,
    private readonly gateway: AiGatewayService,
    private readonly context: TrustedAiContext,
    private readonly mode: WorkbenchAiMode = "deterministic_only",
  ) {}

  async resolve(text: string): Promise<IntentResolutionResult> {
    const formal = await this.deterministic.resolve(text);
    if (this.mode !== "gateway_shadow" || formal.status === "resolved") return formal;
    try {
      await this.gateway.execute({
        context: this.context,
        taskKey: "workbench.intent_resolution",
        taskVersion: 1,
        input: { text },
        idempotencyKey: `shadow:${this.context.correlationId}`,
        locale: "zh-TW",
        qualityTier: "deterministic",
        cacheDirective: "allow",
        requestedOutputUnits: 512,
        requestedCostMicros: 0,
      });
    } catch {
      // Shadow failure is isolated; deterministic Workbench remains authoritative.
    }
    return formal;
  }
}