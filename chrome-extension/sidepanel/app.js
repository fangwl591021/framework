import { SIDE_PANEL_ROUTE_IDS, resolveAdminRoute } from "../shared/admin-navigation.js";
import { bindRuntimeActions, refreshContext, refreshHealth } from "../shared/console-runtime.js";
import { el } from "../shared/console-ui.js";
import { openFullPageDashboard } from "../shared/extension-navigation.js";
import { MessageType } from "../shared/messages.js";
import { consoleData } from "../shared/product-data.js";
import { bindCurrentOaControls, bindSharedShellSynchronization, initializeSharedShellState } from "../shared/shell-state.js";

function renderLatestActivity() {
  const target = document.querySelector("#latest-activity");
  consoleData.activity.forEach((entry) => {
    const row = el("div", "activity-row");
    row.append(el("span", "activity-icon", entry.type === "received" ? "↓" : "↑"));
    const detail = el("div");
    detail.append(el("strong", "", entry.label), el("small", "", entry.text));
    row.append(detail, el("span", "activity-result", entry.result));
    target.append(row);
  });
}

function renderQuickActions() {
  const target = document.querySelector("#quick-admin-actions");
  SIDE_PANEL_ROUTE_IDS.forEach((routeId) => {
    const route = resolveAdminRoute(routeId);
    const button = el("button");
    button.type = "button";
    button.dataset.adminLaunch = route.route;
    button.append(el("strong", "", route.label), el("small", "", "在完整後台開啟"));
    target.append(button);
  });
}

function bindDashboardLaunchers() {
  document.querySelectorAll("[data-admin-launch]").forEach((button) => button.addEventListener("click", () => void openFullPageDashboard(button.dataset.adminLaunch)));
  document.querySelector("#open-full-dashboard").addEventListener("click", () => void openFullPageDashboard("overview"));
  document.querySelector("#maximize-console").addEventListener("click", () => void openFullPageDashboard("overview"));
}

renderLatestActivity();
renderQuickActions();
bindDashboardLaunchers();
bindRuntimeActions(document);
bindCurrentOaControls(document);
bindSharedShellSynchronization(document);
document.querySelector("#return-line").addEventListener("click", async (event) => {
  const result = await chrome.runtime.sendMessage({ type: MessageType.RETURN_TO_LINE });
  if (!result?.ok) event.currentTarget.disabled = true;
});

void initializeSharedShellState(document);
void refreshContext(document);
void refreshHealth(document);