import type { AiProviderRequest, AiProviderResult } from "./models";

export interface AiProviderPort {
  readonly providerKey: string;
  readonly enabled: boolean;
  invoke(request: AiProviderRequest): Promise<AiProviderResult>;
}

export interface AiGatewayObservationPort {
  record(event: Readonly<{
    eventType: "ai.request.completed" | "ai.request.rejected" | "ai.provider.failed" | "ai.budget.exhausted";
    tenantId: string;
    applicationId: string;
    taskKey: string;
    reasonCode: string;
    correlationId: string;
  }>): Promise<void>;
}

export class DisabledAiGatewayObservationAdapter implements AiGatewayObservationPort {
  async record(): Promise<void> {}
}
