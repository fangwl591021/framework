import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { fetchPlatformJson } from "../chrome-extension/shared/api-client.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { sanitizeHealthResponse } from "../chrome-extension/shared/sanitizer.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { validateStorageEntries } from "../chrome-extension/shared/storage.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { FULL_PAGE_DASHBOARD_PATH, openFullPageDashboard } from "../chrome-extension/shared/extension-navigation.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { ADMIN_ROUTE_IDS, SIDE_PANEL_ROUTE_IDS, normalizeAdminPreferences, resolveAdminRoute, toggleCollapsedGroup } from "../chrome-extension/shared/admin-navigation.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { DEFAULT_OA_KEY, normalizeCurrentOaKey } from "../chrome-extension/shared/shell-state.js";

const root = "chrome-extension";
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const html = readFileSync(join(root, "sidepanel/index.html"), "utf8");
const app = readFileSync(join(root, "sidepanel/app.js"), "utf8");
const data = readFileSync(join(root, "shared/product-data.js"), "utf8");
const dashboardHtml = readFileSync(join(root, "dashboard/index.html"), "utf8");
const dashboardApp = readFileSync(join(root, "dashboard/app.js"), "utf8");
const dashboardStyles = readFileSync(join(root, "dashboard/styles.css"), "utf8");
const adminNavigation = readFileSync(join(root, "shared/admin-navigation.js"), "utf8");
const navigation = readFileSync(join(root, "shared/extension-navigation.js"), "utf8");
const consoleUi = readFileSync(join(root, "shared/console-ui.js"), "utf8");
const shellState = readFileSync(join(root, "shared/shell-state.js"), "utf8");
const background = readFileSync(join(root, "background/service-worker.js"), "utf8");
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

  it("keeps the Side Panel as a compact launcher rather than duplicated admin pages", () => {
    for (const id of ["current-oa", "latest-activity", "quick-admin-actions", "open-full-dashboard", "return-line", "refresh-health"]) expect(html).toContain(`id="${id}"`);
    expect(html).not.toMatch(/data-admin-route|data-view=|bottom-nav|<table|<form/);
    expect(app).toContain("SIDE_PANEL_ROUTE_IDS");
  });

  it("uses a fixed full-height traditional admin sidebar", () => {
    expect(dashboardHtml).toContain('class="admin-sidebar"');
    expect(dashboardHtml).toContain("LINE OA 管理平台");
    expect(dashboardStyles).toMatch(/\.admin-sidebar\{position:fixed;[^}]*height:100vh/);
    expect(dashboardStyles).toContain("overflow-y:auto");
  });

  it("defines grouped expandable admin navigation with keyboard-safe buttons", () => {
    for (const group of ["營運中心", "營運工具", "平台管理", "系統"]) expect(adminNavigation).toContain(group);
    expect(dashboardApp).toContain('setAttribute("aria-expanded"');
    expect(dashboardApp).toContain('toggle.addEventListener("click"');
    expect(dashboardStyles).toContain(".nav-item.active");
  });

  it("deterministically expands and collapses allowlisted navigation groups", () => {
    const collapsed = toggleCollapsedGroup(normalizeAdminPreferences({}), "tools");
    expect(collapsed.collapsedAdminGroups).toEqual(["tools"]);
    expect(toggleCollapsedGroup(collapsed, "tools").collapsedAdminGroups).toEqual([]);
    expect(() => validateStorageEntries({ uiPreferences: collapsed })).not.toThrow();
    expect(dashboardApp).toContain("collapsedAdminGroups");
  });

  it("resolves a clear active admin item and rejects unknown routes", () => {
    expect(resolveAdminRoute("bindings")).toEqual({ route: "bindings", groupId: "platform", groupLabel: "平台管理", label: "Channel Binding" });
    expect(resolveAdminRoute("untrusted").route).toBe("overview");
    expect(dashboardApp).toContain('setAttribute("aria-current", "page")');
  });

  it("renders every required admin route without a mobile bottom navigation", () => {
    const routes = ["overview", "accounts", "messages", "rich-menu", "paid-broadcast", "bot-cards", "url-fetcher", "applications", "bindings", "webhook", "audit", "settings"];
    expect(ADMIN_ROUTE_IDS).toEqual(routes);
    for (const route of routes) expect(dashboardHtml).toContain(`data-admin-route="${route}"`);
    expect(dashboardHtml).not.toMatch(/bottom-nav|data-nav=/);
  });

  it("provides a visible maximize button in the side-panel header", () => {
    expect(html).toContain('id="maximize-console"');
    expect(html).toContain('aria-label="開啟完整後台"');
  });

  it("opens or reuses only allowlisted internal dashboard routes", async () => {
    const runtime = { getURL: vi.fn(() => "chrome-extension://extension-id/dashboard/index.html") };
    const tabs = { query: vi.fn(async () => []), create: vi.fn(async () => ({ id: 42 })), update: vi.fn() };
    const getState = vi.fn(async () => ({ uiPreferences: { collapsedAdminGroups: ["system"] } }));
    const setState = vi.fn(async () => undefined);
    await openFullPageDashboard("bindings", { runtime, tabs, getState, setState });
    expect(FULL_PAGE_DASHBOARD_PATH).toBe("dashboard/index.html");
    expect(SIDE_PANEL_ROUTE_IDS).toEqual(["accounts", "messages", "bindings", "webhook", "settings"]);
    expect(setState).toHaveBeenCalledWith({ uiPreferences: { collapsedAdminGroups: ["system"], selectedAdminRoute: "bindings" } });
    expect(tabs.create).toHaveBeenCalledWith({ url: "chrome-extension://extension-id/dashboard/index.html" });
    await expect(openFullPageDashboard("https://evil.invalid", { runtime, tabs, getState, setState })).rejects.toThrow("DASHBOARD_ROUTE_NOT_ALLOWED");
    expect(navigation).not.toMatch(/location|searchParams|parameter|endpoint/i);
  });

  it("reuses an existing dashboard tab without replacing the LINE tab", async () => {
    const tabs = { query: vi.fn(async () => [{ id: 17, url: "chrome-extension://id/dashboard/index.html" }]), create: vi.fn(), update: vi.fn(async () => ({ id: 17 })) };
    await openFullPageDashboard("messages", { runtime: { getURL: () => "chrome-extension://id/dashboard/index.html" }, tabs, getState: async () => ({}), setState: async () => undefined });
    expect(tabs.update).toHaveBeenCalledWith(17, { active: true });
    expect(tabs.create).not.toHaveBeenCalled();
  });

  it("reuses one route registry, product model, storage, sanitizer, API, and runtime layer", () => {
    for (const source of [app, dashboardApp]) {
      expect(source).toContain('../shared/admin-navigation.js');
      expect(source).toContain('../shared/product-data.js');
      expect(source).toContain('../shared/shell-state.js');
    }
    expect(app).not.toContain("sidepanel/data.js");
    expect(dashboardApp).not.toContain("sidepanel/data.js");
    expect(data).toContain("bindings: Object.freeze([");
  });

  it("synchronizes current OA and health through allowlisted storage changes", () => {
    expect(DEFAULT_OA_KEY).toBe("oa-primary");
    expect(normalizeCurrentOaKey("unknown-client-value")).toBe("oa-primary");
    expect(() => validateStorageEntries({ currentOaKey: "oa-primary", lastHealthSummary: { status: "ok" } })).not.toThrow();
    expect(shellState).toContain("chrome.storage.onChanged.addListener");
    expect(shellState).toContain("changes.currentOaKey");
    expect(shellState).toContain("changes.lastHealthSummary");
    expect(background).toContain("lastHealthSummary");
  });

  it("uses the requested accessible sidebar contrast tokens", () => {
    for (const token of ["--text:#1f2937", "--nav:#334155", "--muted:#64748b", "color:#475569", "color:#0f172a", "font-weight:800"]) expect(dashboardStyles).toContain(token);
    expect(dashboardStyles).toContain(".nav-item.active");
    expect(dashboardApp).toContain('setAttribute("aria-current", "page")');
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
    expect(html + dashboardHtml + data).not.toMatch(/channel.?secret|access.?token|reply.?token|user.?id|authorization|raw.?body|raw.?webhook/i);
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

  it("uses the shared safe DOM renderer on both extension surfaces", () => {
    expect(consoleUi).toContain("textContent");
    expect(app).toContain('../shared/console-ui.js');
    expect(dashboardApp).toContain('../shared/console-ui.js');
    expect(app + dashboardApp + consoleUi).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);
  });

  it("does not connect extension modules to the live Worker source", () => {
    const liveWorker = readFileSync("src/line-sandbox-live/worker.ts", "utf8");
    expect(liveWorker).not.toContain("chrome-extension");
    expect(liveWorker).not.toContain("Platform Console");
  });
});
