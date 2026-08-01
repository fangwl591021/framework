import { checkPlatformHealth } from "../shared/api-client.js";
import { openFullPageDashboard } from "../shared/extension-navigation.js";
import { MessageType, isKnownMessage } from "../shared/messages.js";
import { PlatformLifecycle, createPlatformSnapshot, evaluatePlatformLifecycle, projectAuthenticatedPlatform } from "../shared/platform-model.js";
import { sanitizePageContext } from "../shared/sanitizer.js";
import { getSafeStorage, setSafeStorage } from "../shared/storage.js";

const FLOATING_WIDGET_HOSTS = Object.freeze(["manager.line.biz", "chat.line.biz"]);
const FLOATING_WIDGET_HOST_SET = new Set(FLOATING_WIDGET_HOSTS);

chrome.action.onClicked.addListener(() => {
  void openFullPageDashboard("overview").catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isKnownMessage(message)) return false;
  void handleMessage(message, sender).then(sendResponse).catch(() => sendResponse({ ok: false, reasonCode: "EXTENSION_INTERNAL_ERROR" }));
  return true;
});

function resolveTrustedFloatingHost(sender) {
  try {
    const hostname = new URL(sender.tab?.url ?? "").hostname;
    return FLOATING_WIDGET_HOST_SET.has(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

function hasOnlyKeys(value, allowedKeys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((key) => allowedKeys.includes(key));
}

function lifecyclePresentation(lifecycle, view) {
  if (lifecycle === PlatformLifecycle.ACTIVE) return Object.freeze({ launcherLabel: "LINE OA", primaryActionLabel: "開啟完整後台", currentOaLabel: view?.integration?.displayName ?? view?.currentBinding?.bindingKey ?? "LINE OA" });
  if (lifecycle === PlatformLifecycle.UNAUTHENTICATED) return Object.freeze({ launcherLabel: "登入平台", primaryActionLabel: "登入平台", currentOaLabel: "尚未登入" });
  if (lifecycle === PlatformLifecycle.AUTHENTICATED_WITHOUT_WORKSPACE) return Object.freeze({ launcherLabel: "建立工作區", primaryActionLabel: "建立工作區", currentOaLabel: "尚未建立 Workspace" });
  if (lifecycle === PlatformLifecycle.AUTHENTICATED_WITHOUT_BINDING) return Object.freeze({ launcherLabel: "完成 LINE 串接", primaryActionLabel: "完成 LINE 串接", currentOaLabel: view?.workspace?.name ?? "尚未設定 LINE OA" });
  if (lifecycle === PlatformLifecycle.BINDING_PENDING_VERIFICATION) return Object.freeze({ launcherLabel: "等待驗證", primaryActionLabel: "繼續驗證", currentOaLabel: view?.integration?.displayName ?? view?.workspace?.name ?? "LINE OA 待驗證" });
  if (lifecycle === PlatformLifecycle.SESSION_EXPIRED) return Object.freeze({ launcherLabel: "重新登入", primaryActionLabel: "重新登入", currentOaLabel: "工作階段已過期" });
  if (lifecycle === PlatformLifecycle.ACCOUNT_SUSPENDED) return Object.freeze({ launcherLabel: "帳號停權", primaryActionLabel: "查看帳號狀態", currentOaLabel: "帳號已停權" });
  return Object.freeze({ launcherLabel: "登入平台", primaryActionLabel: "登入平台", currentOaLabel: "尚未登入" });
}

async function getFloatingWidgetState(hostname) {
  const stored = await getSafeStorage(["platformState", "lastHealthSummary", "floatingLauncherExpanded", "floatingLauncherHiddenHosts"]);
  const snapshot = createPlatformSnapshot(stored.platformState);
  const lifecycle = evaluatePlatformLifecycle(snapshot);
  let view = null;
  try { view = projectAuthenticatedPlatform(snapshot); } catch { /* lifecycle intentionally has no authorized view */ }
  const presentation = lifecyclePresentation(lifecycle, view);
  const hiddenHosts = Array.isArray(stored.floatingLauncherHiddenHosts) ? stored.floatingLauncherHiddenHosts : [];
  const binding = view?.currentBinding ?? null;
  const online = ["ok", "online"].includes(stored.lastHealthSummary?.status);
  return Object.freeze({
    lifecycle,
    launcherLabel: presentation.launcherLabel,
    primaryActionLabel: presentation.primaryActionLabel,
    currentOaLabel: presentation.currentOaLabel,
    healthStatus: online ? "online" : "offline",
    webhookVerification: view?.messagingChannel?.webhookVerification === "verified" ? "passed" : "unverified",
    currentBinding: binding?.bindingKey ?? "not-configured",
    latestActivity: lifecycle === PlatformLifecycle.ACTIVE ? "最近狀態 · Binding 已驗證" : "請在完整後台完成目前步驟",
    expanded: stored.floatingLauncherExpanded === true,
    hidden: hiddenHosts.includes(hostname),
  });
}

async function updateFloatingWidgetPreference(message, hostname) {
  if (!hasOnlyKeys(message, ["type", "expanded", "hidden"])) return { ok: false, reasonCode: "FLOATING_PREFERENCE_INVALID" };
  if (message.expanded === undefined && message.hidden === undefined) return { ok: false, reasonCode: "FLOATING_PREFERENCE_INVALID" };
  if (message.expanded !== undefined && typeof message.expanded !== "boolean") return { ok: false, reasonCode: "FLOATING_PREFERENCE_INVALID" };
  if (message.hidden !== undefined && typeof message.hidden !== "boolean") return { ok: false, reasonCode: "FLOATING_PREFERENCE_INVALID" };
  const stored = await getSafeStorage(["floatingLauncherExpanded", "floatingLauncherHiddenHosts"]);
  const hiddenHosts = new Set(Array.isArray(stored.floatingLauncherHiddenHosts) ? stored.floatingLauncherHiddenHosts : []);
  if (message.hidden === true) hiddenHosts.add(hostname);
  if (message.hidden === false) hiddenHosts.delete(hostname);
  await setSafeStorage({
    floatingLauncherExpanded: message.hidden === true ? false : (message.expanded ?? stored.floatingLauncherExpanded ?? false),
    floatingLauncherHiddenHosts: FLOATING_WIDGET_HOSTS.filter((host) => hiddenHosts.has(host)),
  });
  return { ok: true, state: await getFloatingWidgetState(hostname) };
}

async function handleMessage(message, sender) {
  if (message.type === MessageType.PAGE_CONTEXT) {
    const context = sanitizePageContext(message.context);
    if (sender.tab?.id !== message.tabId && message.tabId !== undefined) return { ok: false, reasonCode: "PAGE_CONTEXT_TAB_MISMATCH" };
    const entries = { lastPageContext: context };
    if (typeof sender.tab?.id === "number") entries.originatingTab = { tabId: sender.tab.id, pageType: context.pageType };
    await setSafeStorage(entries);
    return { ok: true };
  }
  if (message.type === MessageType.GET_CONTEXT) {
    const stored = await getSafeStorage(["lastPageContext", "originatingTab"]);
    return { ok: true, context: sanitizePageContext(stored.lastPageContext), originatingLineTabAvailable: Number.isInteger(stored.originatingTab?.tabId) };
  }
  if (message.type === MessageType.CHECK_HEALTH) {
    try {
      const health = await checkPlatformHealth({ timeoutMs: 4000 });
      await setSafeStorage({ lastHealthSummary: health });
      return { ok: true, health };
    } catch (error) {
      const health = Object.freeze({ status: "offline", service: "line-sandbox-live", bindingConfigured: false, bindingKey: null });
      await setSafeStorage({ lastHealthSummary: health });
      return { ok: false, reasonCode: error?.reasonCode ?? "HEALTH_OFFLINE", health };
    }
  }
  if (message.type === MessageType.GET_FLOATING_WIDGET_STATE) {
    const hostname = resolveTrustedFloatingHost(sender);
    if (!hostname) return { ok: false, reasonCode: "FLOATING_HOST_NOT_ALLOWED" };
    return { ok: true, state: await getFloatingWidgetState(hostname) };
  }
  if (message.type === MessageType.UPDATE_FLOATING_WIDGET_PREFERENCE) {
    const hostname = resolveTrustedFloatingHost(sender);
    if (!hostname) return { ok: false, reasonCode: "FLOATING_HOST_NOT_ALLOWED" };
    return updateFloatingWidgetPreference(message, hostname);
  }
  if (message.type === MessageType.OPEN_DASHBOARD) {
    const hostname = resolveTrustedFloatingHost(sender);
    if (!hostname || !hasOnlyKeys(message, ["type", "routeId"])) return { ok: false, reasonCode: "DASHBOARD_REQUEST_NOT_ALLOWED" };
    try {
      await openFullPageDashboard(message.routeId);
      return { ok: true };
    } catch {
      return { ok: false, reasonCode: "DASHBOARD_ROUTE_NOT_ALLOWED" };
    }
  }
  if (message.type === MessageType.RETURN_TO_LINE) {
    const stored = await getSafeStorage(["originatingTab"]);
    const tabId = stored.originatingTab?.tabId;
    if (!Number.isInteger(tabId)) return { ok: false, reasonCode: "LINE_TAB_NOT_AVAILABLE" };
    try {
      await chrome.tabs.update(tabId, { active: true });
      return { ok: true };
    } catch {
      return { ok: false, reasonCode: "LINE_TAB_NOT_AVAILABLE" };
    }
  }
  return { ok: false, reasonCode: "MESSAGE_NOT_ALLOWED" };
}
