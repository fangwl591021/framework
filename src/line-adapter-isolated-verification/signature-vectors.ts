const encoder = new TextEncoder();

export const officialPublishedEmptyEventsSignatureVector = Object.freeze({
  vectorId: "line-official-empty-events-hmac-sha256",
  source: "LINE Developers published verification example",
  rawBodyUtf8: '{"destination":"U8e742f61d673b39c7fff3cecb7536ef0","events":[]}',
  publishedSampleKeyUtf8: "8c570fa6dd201bb328f1c1eac23a96d8",
  expectedSignatureBase64: "GhRKmvmHys4Pi8DxkF4+EayaH0OqtJtaZxgTD9fMDLs=",
  headerName: "x-line-signature",
  algorithm: "HMAC-SHA256",
  credential: false,
  localOnly: true,
} as const);

export function officialPublishedVectorBytes(): Readonly<{ rawBody: Uint8Array; fixtureKey: Uint8Array }> {
  return Object.freeze({
    rawBody: encoder.encode(officialPublishedEmptyEventsSignatureVector.rawBodyUtf8),
    fixtureKey: encoder.encode(officialPublishedEmptyEventsSignatureVector.publishedSampleKeyUtf8),
  });
}

export async function signIsolatedFixture(rawBody: Uint8Array, fixtureKey: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", fixtureKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, rawBody));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary);
}
