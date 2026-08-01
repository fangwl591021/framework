import { LineReadinessError } from "./models";

const encoder = new TextEncoder();

export const deterministicLineSignatureVector = Object.freeze({
  vectorId: "line-readiness-hmac-sha256-v1",
  rawBodyUtf8: '{"destination":"fixture-destination","events":[]}',
  fixtureKeyUtf8: "readiness-fixture-key-v1",
  expectedSignatureBase64: "WXe1hp9ZsGX6v6Zlf2mJYQLEK5ZI7R86T7QAr8UtZVU=",
  algorithm: "HMAC-SHA256" as const,
  localOnly: true,
  credential: false,
});

function base64Bytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) return null;
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function verifyLineReadinessSignature(rawBody: Uint8Array, signature: string | null, fixtureKey: Uint8Array): Promise<void> {
  if (!signature) throw new LineReadinessError("LINE_SIGNATURE_MISSING");
  const decoded = base64Bytes(signature);
  if (!decoded || rawBody.byteLength === 0 || rawBody.byteLength > 16 * 1024 || fixtureKey.byteLength < 16 || fixtureKey.byteLength > 128) throw new LineReadinessError("LINE_SIGNATURE_INVALID");
  const key = await crypto.subtle.importKey("raw", fixtureKey, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  if (!(await crypto.subtle.verify("HMAC", key, decoded, rawBody))) throw new LineReadinessError("LINE_SIGNATURE_INVALID");
}

export async function verifyDeterministicLineSignatureVector(): Promise<void> {
  return verifyLineReadinessSignature(
    encoder.encode(deterministicLineSignatureVector.rawBodyUtf8),
    deterministicLineSignatureVector.expectedSignatureBase64,
    encoder.encode(deterministicLineSignatureVector.fixtureKeyUtf8),
  );
}
