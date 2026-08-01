import { ChannelAdapterError, type ChannelCapabilities, type ChannelNeutralResponse, type RenderedChannelResponse } from "./models";
import type { ChannelResponseRendererPort } from "./ports";

const unsafeMarkup = /<\/?(?:script|iframe|object|embed|style)|javascript:|on\w+\s*=/i;
function safeText(value: string, limit: number): { value: string; truncated: boolean } {
  if (unsafeMarkup.test(value)) throw new ChannelAdapterError("CHANNEL_RESPONSE_UNSAFE");
  const points = [...value];
  return points.length <= limit ? { value, truncated: false } : { value: `${points.slice(0, Math.max(0, limit - 1)).join("")}…`, truncated: true };
}
export class LocalWebResponseRenderer implements ChannelResponseRendererPort {
  readonly adapterKey = "local_web_adapter";
  async render(response: ChannelNeutralResponse, capabilities: ChannelCapabilities): Promise<RenderedChannelResponse> {
    const source = response.type === "cards" && !capabilities.supportsCards
      ? response.cards?.map((card) => `${card.title}: ${card.body}`).join("\n") ?? response.text
      : response.text;
    const rendered = safeText(source, capabilities.maxTextLength);
    return Object.freeze({ responseType: response.type === "cards" && !capabilities.supportsCards ? "text" : response.type, messages: Object.freeze([rendered.value].slice(0, capabilities.maxMessages)), truncated: rendered.truncated, networkUsed: false as const });
  }
}
class DisabledRenderer implements ChannelResponseRendererPort {
  constructor(readonly adapterKey: string) {}
  async render(_response: ChannelNeutralResponse, _capabilities: ChannelCapabilities): Promise<RenderedChannelResponse> { throw new ChannelAdapterError("CHANNEL_ADAPTER_DISABLED"); }
}
export class DisabledLineResponseRenderer extends DisabledRenderer { constructor() { super("disabled_line_adapter"); } }
export class DisabledTelegramResponseRenderer extends DisabledRenderer { constructor() { super("disabled_telegram_adapter"); } }

