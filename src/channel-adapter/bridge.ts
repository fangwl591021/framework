import type { WorkbenchInput, WorkbenchResponse } from "../conversational-workbench";
import type { ChannelNeutralResponse, TrustedChannelContext } from "./models";
import type { ChannelWorkbenchPort } from "./ports";

export interface TrustedWorkbenchHandler {
  handle(context: Readonly<{ source: "trusted_runtime_context"; tenantId: string; applicationId: string; actorMembershipId: string; channelKey: string; correlationId: string }>, input: WorkbenchInput): Promise<WorkbenchResponse>;
}
export class ChannelWorkbenchBridge implements ChannelWorkbenchPort {
  constructor(private readonly workbench: TrustedWorkbenchHandler) {}
  async handle(context: TrustedChannelContext, input: Readonly<{ messageKey: string; text: string; locale: string; capabilities: import("./models").ChannelCapabilities; idempotencyKey: string }>): Promise<ChannelNeutralResponse> {
    if (context.source !== "trusted_channel_context") throw new TypeError("UNTRUSTED_CHANNEL_CONTEXT");
    const result = await this.workbench.handle({ source: "trusted_runtime_context", tenantId: context.tenantId, applicationId: context.applicationId, actorMembershipId: context.membershipId, channelKey: `${context.channelType}:${context.channelAccountKey}`, correlationId: context.correlationId }, { messageKey: input.messageKey, text: input.text });
    return Object.freeze({
      type: result.status === "confirmation_required" ? "confirmation" : result.status === "failed" ? "error" : "text",
      text: result.message,
      choices: Object.freeze([...result.choices]),
      supportCode: result.supportCode,
    });
  }
}

