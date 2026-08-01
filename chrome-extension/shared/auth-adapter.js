import { createOpaqueSession } from "./session.js";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LOCAL_DEMO_EMAIL = "demo@platform.local";
function stableUserRef(email) { let hash = 2166136261; for (const character of email) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return `usr-${(hash >>> 0).toString(36).padStart(8, "0")}`; }
function validatePasswordPolicy(value) { return typeof value === "string" && value.length >= 10 && value.length <= 128 && /[A-Za-z]/.test(value) && /\d/.test(value); }

export function validateRegistration(input) {
  const errors = []; const displayName = typeof input?.displayName === "string" ? input.displayName.trim().replace(/\s+/g, " ") : ""; const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : ""; const password = typeof input?.password === "string" ? input.password : ""; const confirmPassword = typeof input?.confirmPassword === "string" ? input.confirmPassword : "";
  if (displayName.length < 2 || displayName.length > 80) errors.push("DISPLAY_NAME_INVALID");
  if (!EMAIL_PATTERN.test(email) || email.length > 160) errors.push("EMAIL_INVALID");
  if (!validatePasswordPolicy(password)) errors.push("PASSWORD_POLICY_FAILED");
  if (password !== confirmPassword) errors.push("PASSWORD_CONFIRMATION_MISMATCH");
  if (input?.termsAccepted !== true) errors.push("TERMS_REQUIRED");
  return Object.freeze({ ok: !errors.length, errors: Object.freeze(errors), normalized: Object.freeze({ displayName, email }) });
}
export function validateSignIn(input) { const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : ""; const errors = []; if (!EMAIL_PATTERN.test(email) || email.length > 160) errors.push("EMAIL_INVALID"); if (!validatePasswordPolicy(input?.password)) errors.push("INVALID_CREDENTIALS"); return Object.freeze({ ok: !errors.length, errors: Object.freeze(errors), normalized: Object.freeze({ email }) }); }

/** @typedef {{register(input: object, users: readonly object[]): Promise<object>, signIn(input: object, users: readonly object[]): Promise<object>, signOut(): Promise<object>}} AuthenticationAdapter */
export class LocalDevelopmentAuthAdapter {
  constructor({ now = () => Date.now() } = {}) { this.now = now; this.descriptor = Object.freeze({ adapterKey: "local_deterministic_auth", executionMode: "local_only", productionAllowed: false }); }
  async register(input, users = []) {
    const validation = validateRegistration(input);
    if (!validation.ok) return Object.freeze({ ok: false, reasonCodes: validation.errors });
    if (validation.normalized.email === LOCAL_DEMO_EMAIL || users.some((entry) => entry.email === validation.normalized.email)) return Object.freeze({ ok: false, reasonCodes: Object.freeze(["DUPLICATE_EMAIL"]) });
    const user = Object.freeze({ userRef: stableUserRef(validation.normalized.email), displayName: validation.normalized.displayName, email: validation.normalized.email, status: "active" });
    return Object.freeze({ ok: true, user, session: createOpaqueSession({ userRef: user.userRef, now: this.now() }), developmentNotice: "LOCAL_AUTHENTICATION_ONLY" });
  }
  async signIn(input, users = []) {
    const validation = validateSignIn(input);
    if (!validation.ok) return Object.freeze({ ok: false, reasonCodes: validation.errors });
    const demo = validation.normalized.email === LOCAL_DEMO_EMAIL;
    const user = demo ? Object.freeze({ userRef: "usr-demo-local", displayName: "Demo Platform User", email: LOCAL_DEMO_EMAIL, status: input.simulation === "suspended" ? "suspended" : "active" }) : users.find((entry) => entry.email === validation.normalized.email);
    if (!user) return Object.freeze({ ok: false, reasonCodes: Object.freeze(["INVALID_CREDENTIALS"]) });
    return Object.freeze({ ok: true, user: Object.freeze({ ...user }), session: createOpaqueSession({ userRef: user.userRef, now: this.now(), simulation: input.simulation }), demoSeedRequired: demo, developmentNotice: "LOCAL_AUTHENTICATION_ONLY" });
  }
  async signOut() { return Object.freeze({ ok: true }); }
}
export function forgotPasswordPlaceholder(email) { return Object.freeze({ ok: false, reasonCode: "BACKEND_PASSWORD_RESET_NOT_IMPLEMENTED", emailAccepted: EMAIL_PATTERN.test(String(email ?? "").trim().toLowerCase()) }); }
