const encoder = new TextEncoder();

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    if (binary.length !== 32) return null;
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function verifyLineSignature(rawBody: Uint8Array, signature: string, channelSecret: string): Promise<boolean> {
  if (!signature || !channelSecret) return false;
  const signatureBytes = decodeBase64(signature);
  if (!signatureBytes) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(channelSecret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, signatureBytes, rawBody);
}
