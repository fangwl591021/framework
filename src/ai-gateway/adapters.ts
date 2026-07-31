import { AiGatewayError, type AiProviderRequest, type AiProviderResult } from "./models";
import type { AiProviderPort } from "./ports";

const intentAllowlist = [
  "event.create", "event.registration_summary", "event.list", "event.cancel",
  "network.my_commission", "network.my_performance", "network.my_referrals",
  "module.list_available", "module.enable", "module.disable",
  "diagnostics.today_summary", "diagnostics.lookup_support_code",
] as const;

export class DeterministicLocalAiAdapter implements AiProviderPort {
  readonly providerKey = "deterministic_local_adapter";
  readonly enabled = true;

  async invoke(request: AiProviderRequest): Promise<AiProviderResult> {
    const simulation = request.input.simulate;
    if (simulation === "timeout" || simulation === "rate_limit") throw new AiGatewayError("AI_PROVIDER_FAILED");
    if (simulation === "invalid") return { output: { html: "<script>bad()</script>" }, inputUnits: 1, outputUnits: 1, latencyMs: 1 };
    const text = String(request.input.text ?? "").normalize("NFKC").trim();
    let output: Readonly<Record<string, unknown>>;
    if (request.taskKey === "workbench.intent_resolution") {
      const intentKey = intentAllowlist.find((key) => text.toLowerCase().includes(key.split(".").pop() ?? key)) ?? null;
      output = { intentKey, confidence: intentKey ? 0.92 : 0.35, choices: intentKey ? [] : intentAllowlist.slice(0, 3) };
    } else if (request.taskKey === "content.translation") {
      output = { text: `[${request.locale}] ${text}` };
    } else {
      output = { text: text.slice(0, request.maxOutputUnits) };
    }
    return { output, inputUnits: Math.max(1, text.length), outputUnits: JSON.stringify(output).length, latencyMs: 1 };
  }
}

abstract class DisabledExternalAdapter implements AiProviderPort {
  abstract readonly providerKey: string;
  readonly enabled = false;
  async invoke(_request?: AiProviderRequest): Promise<AiProviderResult> { throw new AiGatewayError("AI_PROVIDER_DISABLED"); }
}
export class DisabledOpenAiAdapter extends DisabledExternalAdapter { readonly providerKey = "disabled_openai_adapter"; }
export class DisabledGenericProviderAdapter extends DisabledExternalAdapter { readonly providerKey = "disabled_generic_adapter"; }

export function createLocalAiProviderCatalog(): ReadonlyMap<string, AiProviderPort> {
  const adapters: AiProviderPort[] = [new DeterministicLocalAiAdapter(), new DisabledOpenAiAdapter(), new DisabledGenericProviderAdapter()];
  return new Map(adapters.map((adapter) => [adapter.providerKey, adapter]));
}
