import type { ChannelCapabilities, ChannelInboundEvent, ChannelNeutralResponse, RenderedChannelResponse, TrustedChannelContext } from "./models";

export interface ChannelSignatureVerifierPort {
  readonly adapterKey: string;
  verify(rawBody: Uint8Array, signature: string | null, receivedAt: number): Promise<void>;
}
export interface ChannelResponseRendererPort {
  readonly adapterKey: string;
  render(response: ChannelNeutralResponse, capabilities: ChannelCapabilities): Promise<RenderedChannelResponse>;
}
export interface ChannelWorkbenchPort {
  handle(context: TrustedChannelContext, input: Readonly<{
    messageKey: string;
    text: string;
    locale: string;
    capabilities: ChannelCapabilities;
    idempotencyKey: string;
  }>): Promise<ChannelNeutralResponse>;
}
export interface ChannelTrafficAdmissionPort {
  admit(input: Readonly<{
    tenantId: string;
    applicationId: string;
    channelAccountKey: string;
    externalIdentityDigest: string;
    eventType: ChannelInboundEvent["eventType"];
    correlationId: string;
  }>): Promise<Readonly<{ admitted: boolean; release(): Promise<void> }>>;
}
export interface ChannelObservationPort {
  record(event: Readonly<{
    eventType: string;
    tenantId: string | null;
    applicationId: string | null;
    channelAccountKey: string;
    reasonCode: string;
    supportCode: string;
  }>): Promise<void>;
}

