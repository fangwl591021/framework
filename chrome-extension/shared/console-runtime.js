import { AI_LAB_URL, CHANNEL_LAB_URL, WORKBENCH_URL } from "./constants.js";
import { MessageType } from "./messages.js";
import { renderSharedHealth } from "./shell-state.js";

export async function refreshContext(root = document) {
  try {
    const result = await chrome.runtime.sendMessage({ type: MessageType.GET_CONTEXT });
    const labels = { line_oa_manager: "LINE OA Manager", line_chat: "LINE Chat", other: "Other page" };
    const context = result?.context ?? { pageType: "other", pathnameCategory: "other" };
    const badge = root.querySelector("#context-badge");
    const detail = root.querySelector("#context-detail");
    if (badge) badge.textContent = labels[context.pageType] ?? labels.other;
    if (detail) detail.textContent = context.pageType === "other"
      ? "Open LINE OA Manager or LINE Chat to see bounded page context."
      : `${context.pathnameCategory} page · No private page data collected`;
    const returnButton = root.querySelector("#return-line");
    if (returnButton) returnButton.disabled = !result?.originatingLineTabAvailable;
  } catch { /* shell remains useful without page context */ }
}

export async function refreshHealth(root = document) {
  root.querySelectorAll("[data-health-state]").forEach((node) => { node.textContent = "Checking"; });
  try {
    const result = await chrome.runtime.sendMessage({ type: MessageType.CHECK_HEALTH });
    renderSharedHealth(root, result?.health ?? null);
    const note = root.querySelector("#health-note");
    if (note) note.textContent = result?.ok ? "Bounded health response" : (result?.reasonCode ?? "HEALTH_OFFLINE");
  } catch {
    renderSharedHealth(root, null);
  }
}

export function bindRuntimeActions(root = document) {
  root.querySelector("#refresh-health")?.addEventListener("click", () => void refreshHealth(root));
  root.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => {
    const destinations = { workbench: WORKBENCH_URL, aiLab: AI_LAB_URL, channelLab: CHANNEL_LAB_URL };
    const url = destinations[button.dataset.tool];
    if (url) chrome.tabs.create({ url });
  }));
}