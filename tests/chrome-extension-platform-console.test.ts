import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { fetchPlatformJson } from "../chrome-extension/shared/api-client.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { sanitizeHealthResponse } from "../chrome-extension/shared/sanitizer.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { ALLOWED_STORAGE_KEYS, validateStorageEntries } from "../chrome-extension/shared/storage.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { FULL_PAGE_DASHBOARD_PATH, openFullPageDashboard } from "../chrome-extension/shared/extension-navigation.js";
// @ts-expect-error Manifest runtime modules are intentionally plain JavaScript.
import { ADMIN_ROUTE_IDS, normalizeAdminPreferences, resolveAdminRoute, toggleCollapsedGroup } from "../chrome-extension/shared/admin-navigation.js";

const root = "chrome-extension";
const read = (path: string) => readFileSync(join(root, path), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const widget = read("content/floating-widget.js");
const dashboardHtml = read("dashboard/index.html");
const dashboardApp = read("dashboard/app.js");
const dashboardStyles = read("dashboard/styles.css");
const adminNavigation = read("shared/admin-navigation.js");
const platformModel = read("shared/platform-model.js");
const authAdapter = read("shared/auth-adapter.js");
const credentialAdapter = read("shared/credential-adapter.js");
const integrationAdapter = read("shared/integration-adapter.js");
const platformEndpoints = read("shared/platform-endpoints.js");
const verificationAdapter = read("shared/verification-adapter.js");
const integrationStatus = read("shared/integration-status.js");
const platformStore = read("shared/platform-store.js");
const navigation = read("shared/extension-navigation.js");
const background = read("background/service-worker.js");
const manager = read("content/line-oa-manager.js");
const chat = read("content/line-chat.js");
const readme = read("README.md");

function filesUnder(directory: string): string[] { return readdirSync(directory).flatMap((name) => { const path = join(directory, name); return statSync(path).isDirectory() ? filesUnder(path) : [path]; }); }

describe("LINE OA multi-tenant platform extension", () => {
  it("uses Manifest V3 without native Side Panel or new permissions", () => {
    expect(manifest).toMatchObject({ manifest_version: 3, name: "LINE OA Platform Console" });
    expect(manifest).not.toHaveProperty("side_panel");
    expect(manifest.permissions).toEqual(["storage", "tabs", "activeTab"]);
    expect(existsSync(join(root, "sidepanel"))).toBe(false);
  });

  it("injects only on manager and chat in the default isolated world", () => {
    expect(manifest.content_scripts.map((entry: { matches: string[] }) => entry.matches)).toEqual([["https://manager.line.biz/*"], ["https://chat.line.biz/*"]]);
    for (const entry of manifest.content_scripts) { expect(entry.js[0]).toBe("content/floating-widget.js"); expect(entry).not.toHaveProperty("world"); }
    expect(JSON.stringify(manifest.content_scripts)).not.toMatch(/api-data\.line\.me|api\.line\.me|workers\.dev/);
  });

  it("shows extension-owned registration, sign-in, forgot-password, and sign-out", () => {
    for (const id of ["auth-shell", "sign-in-form", "register-form", "forgot-password", "sign-out"]) expect(dashboardHtml).toContain(`id="${id}"`);
    expect(dashboardHtml).toContain("Local Development Authentication");
    expect(dashboardHtml).not.toContain(">oa-primary<");
    expect(dashboardApp).toContain("setFormBusy");
  });

  it("does not render operational data before authentication", () => {
    expect(dashboardHtml).toContain('<section id="platform-shell" hidden>');
    expect(dashboardApp).toContain('navigation.hidden = lifecycle !== PlatformLifecycle.ACTIVE');
    expect(dashboardApp).toContain('document.querySelector("#workspace-onboarding").hidden = false');
  });

  it("implements every explicit lifecycle state", () => {
    for (const state of ["unauthenticated", "authenticated_without_workspace", "authenticated_without_binding", "binding_pending_verification", "active", "session_expired", "account_suspended"]) expect(platformModel).toContain(`"${state}"`);
  });

  it("uses one LINE integration page and no multi-step wizard", () => {
    expect(dashboardHtml).toContain('id="line-integration-page"');
    expect(dashboardHtml).toContain("LINE OA 串接設定");
    expect(dashboardHtml).not.toMatch(/progress-steps|data-progress|Step [1-5]|binding-metadata-form|binding-credential-form/);
    expect(dashboardApp).not.toMatch(/setProgress|onboardingScreen|showOnboardingPanel/);
  });

  it("contains every required one-page integration field", () => {
    for (const name of ["workspaceRef", "displayName", "lineBotAccount", "environment", "note", "lineLoginChannelId", "lineLoginChannelSecret", "messagingChannelId", "messagingChannelSecret", "channelAccessToken"]) expect(dashboardHtml).toContain(`name="${name}"`);
    for (const id of ["callback-url", "webhook-url", "login-status", "messaging-status", "webhook-status", "summary-login-status", "summary-messaging-status", "summary-webhook-status", "overall-integration-status"]) expect(dashboardHtml).toContain(`id="${id}"`);
  });

  it("uses password controls for every password and LINE credential field", () => {
    for (const name of ["password", "confirmPassword", "lineLoginChannelSecret", "messagingChannelSecret", "channelAccessToken"]) expect(dashboardHtml).toMatch(new RegExp(`name="${name}" type="password"`));
    expect(dashboardHtml).toMatch(/name="lineLoginChannelId"[^>]+required/);
    expect(dashboardHtml).toMatch(/name="messagingChannelId"[^>]+required/);
  });

  it("uses explicit draft, local validation, and disabled secure-storage actions", () => {
    for (const label of ["儲存草稿", "驗證欄位格式", "安全儲存尚未開放", "重新驗證", "完成 LINE 整合"]) expect(dashboardHtml + dashboardApp).toContain(label);
    expect(dashboardHtml).toContain('id="submit-integration" class="primary-button" type="submit" disabled');
    expect(dashboardHtml).toContain("平台後端尚未提供安全憑證儲存服務，目前只能儲存非敏感草稿。");
    expect(dashboardHtml + dashboardApp).not.toContain("更新憑證");
  });
  it("clears transient credential controls and never places them in storage", () => {
    expect(dashboardApp).toContain("clearCredentialControls(form)");
    expect(dashboardApp).toContain("clearCredentialControls(form); sensitiveInputStatus = SensitiveInputStatus.CLEARED_AFTER_SUBMISSION");
    expect(dashboardApp).toContain("草稿已儲存。基於安全考量，Secret 與 Access Token 不會保存在擴充功能中。");
    expect(dashboardApp).not.toMatch(/setSafeStorage\(\{[^}]*(password|Secret|Token)/s);
    expect(platformStore).not.toMatch(/password|channelSecret|channelAccessToken/);
  });

  it("uses typed local-only auth, integration, credential, and verification adapters", () => {
    for (const source of [authAdapter, credentialAdapter, integrationAdapter, verificationAdapter]) { expect(source).toContain("@typedef"); expect(source).toContain("productionAllowed: false"); expect(source).not.toMatch(/\bfetch\s*\(/); }
    expect(credentialAdapter).toContain("credentialRegistrationCapability");
  });

  it("returns the exact bounded credential receipt", () => {
    for (const field of ["credentialStorageStatus", "credentialReference", "localValidationReference", "bindingKey", "callbackUrl", "webhookUrl", "loginVerification", "messagingVerification", "webhookVerification", "overallStatus", "reasonCode", "reasonCodes"]) expect(credentialAdapter).toContain(field);
    expect(credentialAdapter).toContain("assertCredentialReceiptSafe");
    expect(credentialAdapter).not.toMatch(/return Object\.freeze\(\{[^}]*(lineLoginChannelSecret|messagingChannelSecret|channelAccessToken)/s);
  });

  it("uses explicit endpoint capabilities without rendering placeholder URLs", () => {
    for (const capability of ["health", "messagingWebhook", "lineLoginCallback", "credentialRegistration", "dynamicBindingProvisioning"]) expect(platformEndpoints).toContain(capability);
    expect(platformEndpoints).toContain("CALLBACK_ENDPOINT_NOT_CONFIGURED");
    expect(platformEndpoints).toContain("DYNAMIC_BINDING_PROVISIONING_NOT_CONFIGURED");
    expect(dashboardHtml + dashboardApp).not.toContain("platform.example.invalid");
    expect(dashboardHtml).toContain('id="copy-callback" type="button" disabled');
    expect(dashboardHtml).toContain('id="copy-webhook" type="button" disabled');
    expect(dashboardHtml).toContain("平台後端尚未提供此端點");
    expect(dashboardApp).toContain('field.value = url ?? "尚未建立"');
    expect(dashboardApp).toContain("button.disabled = !url");
  });

  it("localizes status labels and hides reason codes in technical details", () => {
    for (const label of ["尚未建立", "尚未儲存", "後端尚未開放", "等待驗證", "驗證成功", "驗證失敗"]) expect(dashboardHtml + integrationStatus).toContain(label);
    expect(dashboardHtml).toContain('<details id="integration-technical-details"');
    expect(dashboardHtml).toContain("平台後端尚未完成 Callback、憑證儲存與動態 Webhook 建立，因此目前無法完成正式串接。");
    expect(dashboardApp).not.toContain('`本機輸入已驗證，但平台端點尚未完成：${verification.reasonCodes.join');
  });

  it("keeps sensitive values session-only while persisting non-sensitive draft IDs", () => {
    expect(platformModel).toContain('draftStatus: "saved"');
    expect(dashboardApp).toContain("sensitiveValues");
    expect(dashboardApp).toContain("lineLoginChannelId");
    expect(dashboardApp).toContain("messagingChannelId");
    expect(platformStore).not.toMatch(/lineLoginChannelSecret|messagingChannelSecret|channelAccessToken/);
  });
  it("persists only bounded platform snapshots and UI references", () => {
    expect(ALLOWED_STORAGE_KEYS).toContain("platformState");
    expect(platformStore).toContain("PLATFORM_STATE_TOO_LARGE");
    expect(platformStore).toContain("65_536");
    expect(() => validateStorageEntries({ platformState: { users: [], memberships: [], workspaces: [], applications: [], lineIntegrations: [], loginChannels: [], messagingChannels: [], credentialReferences: [], channelBindings: [], featureEntitlements: [], verificationResults: [], auditEvents: [], session: null, currentWorkspaceRef: null, currentBindingRef: null } })).not.toThrow();
  });

  it.each(["password", "secret", "token", "authorization", "cookie", "replyToken", "userId", "rawBody", "rawPayload", "channelAccessToken", "channelSecret", "loginChannelSecret", "credentialValue"])("recursively rejects sensitive storage field %s", (key) => {
    expect(() => validateStorageEntries({ platformState: { users: [{ nested: { [key]: "blocked" } }] } })).toThrow("SENSITIVE_FIELD_REJECTED");
  });

  it("renders the exact grouped 17-route admin registry", () => {
    const routes = ["overview", "accounts", "messages", "keyword-rules", "default-reply", "auto-reply", "rich-menu", "bot-cards", "url-fetcher", "line-integration", "applications", "team-permissions", "usage", "audit", "profile", "settings", "logout"];
    expect(ADMIN_ROUTE_IDS).toEqual(routes);
    for (const route of routes) expect(dashboardHtml).toContain(`data-admin-route="${route}"`);
    for (const label of ["營運中心", "自動化", "內容工具", "平台管理", "帳戶"]) expect(adminNavigation).toContain(label);
  });

  it("marks incomplete modules unavailable with a visible reason", () => {
    expect(adminNavigation.match(/availability: "not_entitled"/g)?.length).toBe(6);
    expect(dashboardApp).toContain('button.title = button.disabled ? "目前 Workspace 尚未取得此功能"');
    expect(dashboardHtml.match(/尚未包含於目前方案/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it("keeps grouped keyboard-accessible navigation and allowlisted collapse state", () => {
    expect(dashboardApp).toContain('setAttribute("aria-expanded"'); expect(dashboardApp).toContain('setAttribute("aria-current", "page")');
    expect(dashboardStyles).toContain(".nav-item.active"); expect(dashboardStyles).toContain("button:focus-visible");
    const collapsed = toggleCollapsedGroup(normalizeAdminPreferences({}), "automation");
    expect(collapsed.collapsedAdminGroups).toEqual(["automation"]);
    expect(toggleCollapsedGroup(collapsed, "automation").collapsedAdminGroups).toEqual([]);
    expect(resolveAdminRoute("untrusted").route).toBe("overview");
  });

  it("makes toolbar action open the dashboard and never the Side Panel", () => {
    const actionHandler = background.slice(background.indexOf("chrome.action.onClicked.addListener"), background.indexOf("chrome.runtime.onMessage.addListener"));
    expect(actionHandler).toContain('openFullPageDashboard("overview")');
    expect(background).not.toContain("chrome.sidePanel");
  });

  it("opens or reuses only allowlisted internal dashboard routes", async () => {
    const runtime = { getURL: vi.fn(() => "chrome-extension://extension-id/dashboard/index.html") };
    const tabs = { query: vi.fn(async () => []), create: vi.fn(async () => ({ id: 42 })), update: vi.fn() };
    const getState = vi.fn(async () => ({ uiPreferences: {} })); const setState = vi.fn(async () => undefined);
    await openFullPageDashboard("line-integration", { runtime, tabs, getState, setState });
    expect(FULL_PAGE_DASHBOARD_PATH).toBe("dashboard/index.html"); expect(tabs.create).toHaveBeenCalledWith({ url: "chrome-extension://extension-id/dashboard/index.html" });
    await expect(openFullPageDashboard("https://evil.invalid", { runtime, tabs, getState, setState })).rejects.toThrow("DASHBOARD_ROUTE_NOT_ALLOWED");
    expect(navigation).not.toMatch(/endpoint/i);
  });

  it("reuses an existing dashboard tab", async () => {
    const tabs = { query: vi.fn(async () => [{ id: 17, url: "chrome-extension://id/dashboard/index.html" }]), create: vi.fn(), update: vi.fn(async () => ({ id: 17 })) };
    await openFullPageDashboard("overview", { runtime: { getURL: () => "chrome-extension://id/dashboard/index.html" }, tabs, getState: async () => ({}), setState: async () => undefined });
    expect(tabs.update).toHaveBeenCalledWith(17, { active: true }); expect(tabs.create).not.toHaveBeenCalled();
  });

  it("keeps the bounded floating launcher lifecycle mapping", () => {
    for (const label of ["登入平台", "建立工作區", "完成 LINE 串接", "等待驗證", "重新登入", "帳號停權", "LINE OA"]) expect(background + widget).toContain(label);
    expect(widget).toContain('attachShadow({ mode: "closed" })'); expect(widget).toContain("panel.hidden = true"); expect(widget).toContain('event.key === "Escape"');
    expect(widget).not.toMatch(/document\.body|\.style\.(?:width|margin|padding)|setAttribute\(["']style/);
  });

  it("resolves launcher state only for trusted LINE hosts", () => {
    expect(background).toContain('Object.freeze(["manager.line.biz", "chat.line.biz"])');
    expect(background).toContain("resolveTrustedFloatingHost(sender)"); expect(background).toContain("FLOATING_HOST_NOT_ALLOWED");
  });

  it("content scripts send only bounded metadata and do not scrape host data", () => {
    for (const source of [manager, chat]) {
      expect(source).toContain("pathnameCategory"); expect(source).toContain("PlatformLineFloatingWidget?.mount()");
      expect(source).not.toMatch(/document\.(body|cookie)|localStorage|sessionStorage|textContent|innerText|querySelector|XMLHttpRequest|fetch\(/);
    }
  });

  it("rejects arbitrary API origins before any fetch", async () => {
    const fetchImpl = vi.fn();
    await expect(fetchPlatformJson("https://evil.invalid/health", { fetchImpl })).rejects.toMatchObject({ reasonCode: "ENDPOINT_NOT_ALLOWED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sanitizes bounded health responses", () => {
    const result = sanitizeHealthResponse({ status: "OK", service: "x".repeat(200), bindingConfigured: true, bindingKey: "oa-primary", extra: "discarded" });
    expect(result).toEqual({ status: "ok", service: "x".repeat(80), bindingConfigured: true, bindingKey: "oa-primary" }); expect(result).not.toHaveProperty("extra");
  });

  it("contains no remote executable code, inline code, or dynamic evaluation", () => {
    const sources = filesUnder(root).filter((path) => /\.(?:js|html)$/.test(path)).map((path) => readFileSync(path, "utf8")).join("\n");
    expect(sources).not.toMatch(/<script[^>]+src=["']https?:/i); expect(sources).not.toMatch(/<script(?![^>]+src=)[^>]*>\s*[^<]/i);
    expect(sources).not.toMatch(/\beval\s*\(|new\s+Function\s*\(|import\s*\(\s*["']https?:/);
  });

  it("documents local-only authentication, one-page setup, demo behavior, and backend gaps", () => {
    for (const phrase of ["Local Development Authentication", "One-page", "demo@platform.local", "Backend contracts still required", "live LINE Worker"] ) expect(readme).toContain(phrase);
  });

  it("does not connect extension modules to or modify live Worker composition", () => {
    const liveWorker = readFileSync("src/line-sandbox-live/worker.ts", "utf8");
    expect(liveWorker).not.toContain("chrome-extension"); expect(liveWorker).not.toContain("platformState");
  });
});
