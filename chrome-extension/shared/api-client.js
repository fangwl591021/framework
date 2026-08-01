import { PLATFORM_HEALTH_URL } from "./constants.js";
import { sanitizeHealthResponse } from "./sanitizer.js";

const ALLOWED_ENDPOINTS = new Set([PLATFORM_HEALTH_URL]);

export class PlatformApiError extends Error {
  constructor(reasonCode) {
    super(reasonCode);
    this.name = "PlatformApiError";
    this.reasonCode = reasonCode;
  }
}

export async function fetchPlatformJson(url, options = {}) {
  if (!ALLOWED_ENDPOINTS.has(url)) throw new PlatformApiError("ENDPOINT_NOT_ALLOWED");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = Math.min(10000, Math.max(1000, Number(options.timeoutMs) || 4000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new PlatformApiError("HEALTH_NON_2XX");
    const raw = await response.text();
    if (raw.length > 4096) throw new PlatformApiError("HEALTH_RESPONSE_TOO_LARGE");
    try {
      return sanitizeHealthResponse(JSON.parse(raw));
    } catch (error) {
      if (error instanceof PlatformApiError) throw error;
      throw new PlatformApiError("HEALTH_INVALID_JSON");
    }
  } catch (error) {
    if (error instanceof PlatformApiError) throw error;
    if (error?.name === "AbortError") throw new PlatformApiError("HEALTH_TIMEOUT");
    throw new PlatformApiError("HEALTH_OFFLINE");
  } finally {
    clearTimeout(timeout);
  }
}

export function checkPlatformHealth(options = {}) {
  return fetchPlatformJson(PLATFORM_HEALTH_URL, options);
}
