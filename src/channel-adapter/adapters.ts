import { ChannelAdapterError } from "./models";
import type { ChannelSignatureVerifierPort } from "./ports";

const encoder = new TextEncoder();
const LOCAL_FIXTURE_KEY = encoder.encode("platform-core-local-channel-fixture-v1");
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;
function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
function signatureParts(value: string): { timestamp: number; digest: string } | null {
  const match = /^t=(\d{1,16}),v1=([0-9a-f]{64})$/.exec(value);
  return match ? { timestamp: Number(match[1] as string), digest: match[2] as string } : null;
}
async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", LOCAL_FIXTURE_KEY, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
function signedBytes(timestamp: number, rawBody: Uint8Array): Uint8Array {
  const prefix = encoder.encode(`${timestamp}.`);
  const combined = new Uint8Array(prefix.length + rawBody.length);
  combined.set(prefix); combined.set(rawBody, prefix.length);
  return combined;
}
function fromHex(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}
export async function localFixtureSignature(rawBody: Uint8Array, timestamp: number): Promise<string> {
  const digest = await crypto.subtle.sign("HMAC", await hmacKey(), signedBytes(timestamp, rawBody));
  return `t=${timestamp},v1=${hex(digest)}`;
}
export class LocalDeterministicSignatureVerifier implements ChannelSignatureVerifierPort {
  readonly adapterKey = "local_web_adapter";
  async verify(rawBody: Uint8Array, signature: string | null, receivedAt: number): Promise<void> {
    if (!signature) throw new ChannelAdapterError("CHANNEL_SIGNATURE_MISSING");
    const parsed = signatureParts(signature);
    if (!parsed) throw new ChannelAdapterError("CHANNEL_SIGNATURE_INVALID");
    if (Math.abs(receivedAt - parsed.timestamp) > MAX_SIGNATURE_AGE_MS) throw new ChannelAdapterError("CHANNEL_SIGNATURE_EXPIRED");
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(), fromHex(parsed.digest), signedBytes(parsed.timestamp, rawBody));
    if (!valid) throw new ChannelAdapterError("CHANNEL_SIGNATURE_INVALID");
  }
}
class DisabledVerifier implements ChannelSignatureVerifierPort {
  constructor(readonly adapterKey: string) {}
  async verify(_rawBody: Uint8Array, _signature: string | null, _receivedAt: number): Promise<void> { throw new ChannelAdapterError("CHANNEL_ADAPTER_DISABLED"); }
}
export class DisabledLineSignatureVerifier extends DisabledVerifier { constructor() { super("disabled_line_adapter"); } }
export class DisabledTelegramSignatureVerifier extends DisabledVerifier { constructor() { super("disabled_telegram_adapter"); } }
export class DisabledGenericWebhookVerifier extends DisabledVerifier { constructor() { super("disabled_generic_webhook_adapter"); } }

