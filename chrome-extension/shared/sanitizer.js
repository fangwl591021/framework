import { PAGE_TYPES, PATH_CATEGORIES } from "./constants.js";

const SENSITIVE_KEY = /(password|secret|token|authorization|reply.?token|user.?id|customer.?id|cookie|raw.?body|raw.?payload|raw.?webhook|channel.?secret|access.?token|credential.?value)/i;
const SAFE_HEALTH_STATUS = new Set(["ok", "online", "degraded", "offline", "unknown"]);
const SAFE_HOSTS = new Set(["manager.line.biz", "chat.line.biz"]);

export function assertNoSensitiveFields(value, depth = 0) {
  if (depth > 4) throw new Error("VALUE_TOO_DEEP");
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return;
  if (Array.isArray(value)) {
    if (value.length > 40) throw new Error("VALUE_TOO_LARGE");
    value.forEach((item) => assertNoSensitiveFields(item, depth + 1));
    return;
  }
  if (typeof value !== "object") throw new Error("VALUE_NOT_SERIALIZABLE");
  const entries = Object.entries(value);
  if (entries.length > 40) throw new Error("VALUE_TOO_LARGE");
  for (const [key, item] of entries) {
    if (SENSITIVE_KEY.test(key)) throw new Error("SENSITIVE_FIELD_REJECTED");
    assertNoSensitiveFields(item, depth + 1);
  }
}

export function sanitizePageContext(input) {
  if (!input || typeof input !== "object") return Object.freeze({ hostname: "other", pathnameCategory: "other", pageType: "other" });
  const hostname = SAFE_HOSTS.has(input.hostname) ? input.hostname : "other";
  const pageType = PAGE_TYPES.includes(input.pageType) ? input.pageType : "other";
  const pathnameCategory = PATH_CATEGORIES.includes(input.pathnameCategory) ? input.pathnameCategory : "other";
  return Object.freeze({ hostname, pathnameCategory, pageType });
}

export function sanitizeHealthResponse(input) {
  if (!input || typeof input !== "object") throw new Error("HEALTH_INVALID_JSON");
  const rawStatus = typeof input.status === "string" ? input.status.toLowerCase() : "unknown";
  const status = SAFE_HEALTH_STATUS.has(rawStatus) ? rawStatus : "unknown";
  const service = typeof input.service === "string" ? input.service.slice(0, 80) : "line-sandbox-live";
  const bindingConfigured = input.bindingConfigured === true;
  const bindingKey = typeof input.bindingKey === "string" && /^[a-z][a-z0-9_-]{2,47}$/.test(input.bindingKey)
    ? input.bindingKey
    : null;
  return Object.freeze({ status, service, bindingConfigured, bindingKey });
}
