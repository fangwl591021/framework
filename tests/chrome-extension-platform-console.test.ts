import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { fetchPlatformJson } from "../chrome-extension/shared/api-client.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { sanitizeHealthResponse } from "../chrome-extension/shared/sanitizer.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { validateStorageEntries } from "../chrome-extension/shared/storage.js";

const root = "chrome-extension";
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const html = readFileSync(join(root, "sidepanel/index.html"), "utf8");
const app = readFileSync(join(root, "sidepanel/app.js"), "utf8");
const data = readFileSync(join(root, "sidepanel/data.js"), "utf8");
const manager = readFileSync(join(root, "content/line-oa-manager.js"), "utf8");
const chat = readFileSync(join(root, "content/line-chat.js"), "utf8");

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("LINE OA Platform Console", () => {
  it("uses a valid Manifest V3 side-panel configuration", () => {
    expect(manifest).toMatchObject({ manifest_version: 3, name: "LINE OA Platform Console", version: "0.1.0" });
    expect(manifest.side_panel.default_path).toBe("sidepanel/index.html");
    expect(manifest.background.type).toBe("module");
  });

  it("declares the exact requested extension permissions", () => {
    expect(manifest.permissions).toEqual(["sidePanel", "storage", "tabs", "activeTab"]);
    expect(manifest.host_permissions).toEqual([
      "https://api-data.line.me/*",
      "https://api.line.me/*",
      "https://chat.line.biz/*",
      "https://line-oa.fangwl591021.workers.dev/*",
      "https://manager.line.biz/*",
      "https://platform-core-line-sandbox-live.fangwl591021.workers.dev/*",
    ]);
  });

  it("limits content scripts to manager and chat pages", () => {
    expect(manifest.content_scripts.map((entry: { matches: string[] }) => entry.matches)).toEqual([
      ["https://manager.line.biz/*"],
      ["https://chat.line.biz/*"],
    ]);
    expect(JSON.stringify(manifest.content_scripts)).not.toMatch(/api-data\.line\.me|api\.line\.me|workers\.dev/);
  });

  it("renders all five primary product views", () => {
    for (const view of ["home", "accounts", "messages", "applications", "settings"]) {
      expect(html).toContain(`data-view="${view}"`);
      expect(html).toContain(`data-nav="${view}"`);
    }
  });

  it("shows the first binding and deterministic real proof", () => {
    expect(data).toContain('bindingKey: "oa-primary"');
    expect(data).toContain('text: "測試"');
    expect(data).toContain('text: "收到：測試"');
  });

  it("uses immutable multi-binding-ready Tenant and Application data", () => {
    expect(data).toContain("applications: Object.freeze([");
    expect(data).toContain("bindings: Object.freeze([");
    expect(data).toContain('tenantKey: "tenant-primary"');
    expect(data).toContain('bindingKeys: Object.freeze(["oa-primary"])');
  });

  it("keeps sensitive transport and identity values out of rendered data", () => {
    expect(html + data).not.toMatch(/channel.?secret|access.?token|reply.?token|user.?id|authorization|raw.?body|raw.?webhook/i);
  });

  it.each(["secret", "accessToken", "authorization", "replyToken", "userId", "cookie", "rawBody"])(
    "rejects sensitive storage field %s",
    (key) => expect(() => validateStorageEntries({ uiPreferences: { [key]: "blocked" } })).toThrow("SENSITIVE_FIELD_REJECTED"),
  );

  it("rejects storage keys outside the allowlist", () => {
    expect(() => validateStorageEntries({ arbitrary: true })).toThrow("STORAGE_KEY_NOT_ALLOWED");
  });

  it("rejects arbitrary API origins before network access", async () => {
    const fetchImpl = vi.fn();
    await expect(fetchPlatformJson("https://evil.invalid/health", { fetchImpl })).rejects.toMatchObject({ reasonCode: "ENDPOINT_NOT_ALLOWED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sanitizes and bounds health response fields", () => {
    const result = sanitizeHealthResponse({ status: "OK", service: "x".repeat(200), bindingConfigured: true, bindingKey: "oa-primary", extra: "discarded" });
    expect(result).toEqual({ status: "ok", service: "x".repeat(80), bindingConfigured: true, bindingKey: "oa-primary" });
    expect(result).not.toHaveProperty("extra");
  });

  it("content scripts send only bounded page context metadata", () => {
    for (const source of [manager, chat]) {
      expect(source).toContain("pathnameCategory");
      expect(source).toContain("pageType");
      expect(source).toContain("hostname");
      expect(source).not.toMatch(/document\.(body|cookie)|localStorage|sessionStorage|textContent|innerText|querySelector|XMLHttpRequest|fetch\(/);
    }
  });

  it("contains no remote executable scripts or dynamic code evaluation", () => {
    const source = filesUnder(root).filter((path) => /\.(?:js|html)$/.test(path)).map((path) => readFileSync(path, "utf8")).join("\n");
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/i);
    expect(source).not.toMatch(/\beval\s*\(|new\s+Function\s*\(/);
    expect(source).not.toMatch(/import\s*\(\s*["']https?:/);
  });

  it("uses safe DOM rendering in the side panel", () => {
    expect(app).toContain("textContent");
    expect(app).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);
  });

  it("does not connect extension modules to the live Worker source", () => {
    const liveWorker = readFileSync("src/line-sandbox-live/worker.ts", "utf8");
    expect(liveWorker).not.toContain("chrome-extension");
    expect(liveWorker).not.toContain("Platform Console");
  });
});
