import { sha256Hex } from "../persistence/crypto";

export const LOCAL_COOKIE = "pc_local_demo";
export function canonicalPath(url: URL, pathname: string): URL | null {
  const target = new URL(url);
  target.pathname = pathname;
  return target.href === url.href ? null : target;
}
export function localOnly(request: Request, mode: string | undefined): boolean {
  const host = new URL(request.url).hostname;
  return (
    mode === "enabled" &&
    (host === "localhost" || host === "127.0.0.1" || host === "[::1]")
  );
}
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
export function cookieValue(request: Request): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const item = cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${LOCAL_COOKIE}=`));
  return item ? decodeURIComponent(item.slice(LOCAL_COOKIE.length + 1)) : null;
}
export function sessionCookie(token: string): string {
  return `${LOCAL_COOKIE}=${encodeURIComponent(token)}; Path=/local; HttpOnly; SameSite=Strict; Max-Age=14400`;
}
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export const digestToken = sha256Hex;
export function assertSafePayload(value: unknown): void {
  const forbidden = new Set([
    "tenantId",
    "applicationId",
    "actorMembershipId",
    "role",
    "roles",
    "permission",
    "permissions",
  ]);
  const walk = (item: unknown, depth: number) => {
    if (depth > 5) throw new TypeError("PAYLOAD_TOO_DEEP");
    if (!item || typeof item !== "object") return;
    if (Array.isArray(item)) {
      if (item.length > 50) throw new TypeError("PAYLOAD_TOO_LARGE");
      item.forEach((x) => walk(x, depth + 1));
      return;
    }
    for (const [key, child] of Object.entries(
      item as Record<string, unknown>,
    )) {
      if (forbidden.has(key)) throw new TypeError("UNTRUSTED_CONTEXT_FIELD");
      walk(child, depth + 1);
    }
  };
  walk(value, 0);
}
