import type { Clock } from "../../core/clock";
import { sha256Hex } from "../../persistence/crypto";
import { EventEngineError, type EventQrClaims } from "./models";
import type { EventQrKeyProvider, EventQrTokenPort } from "./ports";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importHmacKey(secret: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function isClaims(value: unknown): value is EventQrClaims {
  if (!value || typeof value !== "object") return false;
  const claims = value as Record<string, unknown>;
  return (
    claims.version === 1
    && typeof claims.tenantId === "string"
    && typeof claims.eventId === "string"
    && typeof claims.sessionId === "string"
    && typeof claims.registrationId === "string"
    && typeof claims.expiresAt === "number"
    && Number.isSafeInteger(claims.expiresAt)
    && typeof claims.nonce === "string"
  );
}

export class HmacEventQrTokenService implements EventQrTokenPort {
  constructor(
    private readonly keys: EventQrKeyProvider,
    private readonly clock: Clock,
  ) {}

  async issue(claims: EventQrClaims): Promise<string> {
    if (!isClaims(claims) || claims.expiresAt <= this.clock.now().getTime()) {
      throw new EventEngineError("EVENT_QR_INVALID");
    }
    const key = this.keys.current();
    if (key.secret.byteLength < 32 || key.version <= 0) {
      throw new EventEngineError("EVENT_QR_INVALID");
    }
    const payload = toBase64Url(encoder.encode(JSON.stringify(claims)));
    const signingInput = `evt1.k${key.version}.${payload}`;
    const signature = await crypto.subtle.sign(
      "HMAC",
      await importHmacKey(key.secret),
      encoder.encode(signingInput),
    );
    return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
  }

  async verify(token: string, now: number): Promise<EventQrClaims> {
    try {
      const [prefix, keyPart, payload, signature, extra] = token.split(".");
      if (
        prefix !== "evt1"
        || !keyPart?.startsWith("k")
        || !payload
        || !signature
        || extra !== undefined
      ) {
        throw new EventEngineError("EVENT_QR_INVALID");
      }
      const version = Number(keyPart.slice(1));
      const key = this.keys.resolve(version);
      if (!key || key.secret.byteLength < 32) {
        throw new EventEngineError("EVENT_QR_INVALID");
      }
      const valid = await crypto.subtle.verify(
        "HMAC",
        await importHmacKey(key.secret),
        fromBase64Url(signature),
        encoder.encode(`${prefix}.${keyPart}.${payload}`),
      );
      if (!valid) throw new EventEngineError("EVENT_QR_INVALID");
      const claims = JSON.parse(decoder.decode(fromBase64Url(payload))) as unknown;
      if (!isClaims(claims)) throw new EventEngineError("EVENT_QR_INVALID");
      if (claims.expiresAt <= now) {
        throw new EventEngineError("EVENT_QR_EXPIRED");
      }
      return claims;
    } catch (error) {
      if (error instanceof EventEngineError) throw error;
      throw new EventEngineError("EVENT_QR_INVALID");
    }
  }

  digest(token: string): Promise<string> {
    return sha256Hex(token);
  }
}
