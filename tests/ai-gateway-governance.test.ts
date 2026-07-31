import { describe, expect, it } from "vitest";
import { AiGatewayService } from "../src/ai-gateway/application";
import type { AiProviderPort } from "../src/ai-gateway/ports";
import type { AiGatewayRepository } from "../src/ai-gateway/repository";
import type { ProviderGovernanceGate, ProviderRouteGovernanceRequest } from "../src/ai-provider-governance/models";
import type { UuidV7 } from "../src/core/uuidv7";

const route = { providerKey: "fictional_external_adapter", modelKey: "fictional-model", modelVersion: "1" };
const request = { taskKey: "content.safe_rewrite" as const, taskVersion: 1 as const, input: { text: "safe" }, locale: "en", maxOutputUnits: 100, timeoutMs: 100 };
const governanceRequest = { taskKey: "content.safe_rewrite" as const, taskVersion: 1 as const, environment: "local" as const, tenantId: "tenant-a", applicationId: "application-a", sensitivity: "internal" as const, inputUnits: 4, outputUnits: 100, estimatedCostMicros: 1, interactive: true };

function service(provider: AiProviderPort, gate?: ProviderGovernanceGate) {
  return new AiGatewayService(
    {} as AiGatewayRepository,
    { generate: () => "019f0000-0000-7000-8000-000000000001" } as UuidV7,
    new Map([[provider.providerKey, provider]]),
    { record: async () => undefined },
    () => 1,
    gate,
  );
}

describe("AI Gateway provider governance integration", () => {
  it("never invokes an external adapter without the server-owned governance gate", async () => {
    let invocations = 0;
    const provider: AiProviderPort = { providerKey: route.providerKey, enabled: true, invoke: async () => { invocations += 1; return { output: { text: "unsafe-bypass" }, inputUnits: 1, outputUnits: 1, latencyMs: 1 }; } };
    await expect(service(provider).invokeProvider([route], request, governanceRequest)).rejects.toMatchObject({ code: "AI_PROVIDER_FAILED" });
    expect(invocations).toBe(0);
  });

  it("runs governance before invoking an external adapter", async () => {
    const order: string[] = [];
    const gate: ProviderGovernanceGate = { authorize: async (candidate: ProviderRouteGovernanceRequest) => { expect(candidate).toMatchObject(route); order.push("governance"); } };
    const provider: AiProviderPort = { providerKey: route.providerKey, enabled: true, invoke: async () => { order.push("provider"); return { output: { text: "shadow" }, inputUnits: 1, outputUnits: 1, latencyMs: 1 }; } };
    await expect(service(provider, gate).invokeProvider([route], request, governanceRequest)).resolves.toMatchObject({ route });
    expect(order).toEqual(["governance", "provider"]);
  });

  it("does not invoke the adapter when governance rejects the route", async () => {
    let invocations = 0;
    const gate: ProviderGovernanceGate = { authorize: async () => { throw new Error("governance-denied"); } };
    const provider: AiProviderPort = { providerKey: route.providerKey, enabled: true, invoke: async () => { invocations += 1; return { output: {}, inputUnits: 0, outputUnits: 0, latencyMs: 0 }; } };
    await expect(service(provider, gate).invokeProvider([route], request, governanceRequest)).rejects.toThrow("governance-denied");
    expect(invocations).toBe(0);
  });
});
