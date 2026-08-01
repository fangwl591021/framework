import { checkPlatformHealth } from "../shared/api-client.js";
import { MessageType, isKnownMessage } from "../shared/messages.js";
import { sanitizePageContext } from "../shared/sanitizer.js";
import { getSafeStorage, setSafeStorage } from "../shared/storage.js";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.action.onClicked.addListener(async (tab) => {
  if (typeof tab.id !== "number") return;
  try { await chrome.sidePanel.open({ tabId: tab.id }); } catch { /* unsupported window state */ }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isKnownMessage(message)) return false;
  void handleMessage(message, sender).then(sendResponse).catch(() => sendResponse({ ok: false, reasonCode: "EXTENSION_INTERNAL_ERROR" }));
  return true;
});

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
    return {
      ok: true,
      context: sanitizePageContext(stored.lastPageContext),
      originatingLineTabAvailable: Number.isInteger(stored.originatingTab?.tabId),
    };
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
  if (message.type === MessageType.OPEN_PANEL && typeof sender.tab?.id === "number") {
    try {
      await chrome.sidePanel.open({ tabId: sender.tab.id });
      return { ok: true };
    } catch {
      return { ok: false, reasonCode: "SIDE_PANEL_NOT_AVAILABLE" };
    }
  }
  return { ok: false, reasonCode: "MESSAGE_NOT_ALLOWED" };
}
