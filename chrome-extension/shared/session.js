function stableSessionReference(userRef, issuedAt) {
  let hash = 2166136261;
  for (const character of `${userRef}:${issuedAt}`) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `ses-${(hash >>> 0).toString(36).padStart(8, "0")}`;
}
export function createOpaqueSession({ userRef, now = Date.now(), simulation = "active" }) {
  if (!/^usr-[a-z0-9-]{3,48}$/.test(userRef)) throw new Error("USER_REFERENCE_INVALID");
  const expiresAt = simulation === "expired" ? now - 1 : now + 3_600_000;
  return Object.freeze({ sessionReference: stableSessionReference(userRef, now), userRef, issuedAt: now, expiresAt, provider: "local_development" });
}
export function isOpaqueSession(value) { return Boolean(value && /^ses-[a-z0-9]{6,20}$/.test(value.sessionReference) && /^usr-[a-z0-9-]{3,48}$/.test(value.userRef) && Number.isFinite(value.expiresAt)); }
