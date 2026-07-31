export interface IdentityDigestKey {
  readonly version: number;
  readonly secret: Uint8Array;
}

export interface IdentityDigestKeyProvider {
  current(): IdentityDigestKey;
  previous(): readonly IdentityDigestKey[];
}

const encoder = new TextEncoder();

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalComponent(value: string): string {
  const bytes = encoder.encode(value);
  return `${bytes.length}:${value}`;
}

export function canonicalIdentitySubject(
  provider: string,
  issuerContext: string,
  subject: string,
): Uint8Array {
  if (!provider || !issuerContext || !subject) {
    throw new TypeError("Identity subject components must be non-empty");
  }
  return encoder.encode(
    `identity-subject-v1|${canonicalComponent(provider)}|${canonicalComponent(issuerContext)}|${canonicalComponent(subject)}`,
  );
}

export async function hmacSha256Hex(
  key: Uint8Array,
  data: Uint8Array,
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", cryptoKey, data));
}

export async function digestIdentitySubject(
  key: IdentityDigestKey,
  provider: string,
  issuerContext: string,
  subject: string,
): Promise<string> {
  return hmacSha256Hex(
    key.secret,
    canonicalIdentitySubject(provider, issuerContext, subject),
  );
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Fingerprint input must be JSON-compatible");
}

export async function requestFingerprint(value: unknown): Promise<string> {
  return sha256Hex(canonicalJson(value));
}
