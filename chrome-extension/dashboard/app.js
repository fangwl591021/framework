import { ADMIN_NAVIGATION, normalizeAdminPreferences, resolveAdminRoute, toggleCollapsedGroup } from "../shared/admin-navigation.js";
import { bindRuntimeActions, refreshContext, refreshHealth } from "../shared/console-runtime.js";
import { bindCopyWebhook, el } from "../shared/console-ui.js";
import { MessageType } from "../shared/messages.js";
import { consoleData } from "../shared/product-data.js";
import { getSafeStorage, setSafeStorage } from "../shared/storage.js";
import { bindCurrentOaControls, bindSharedShellSynchronization, initializeSharedShellState } from "../shared/shell-state.js";

let uiPreferences = normalizeAdminPreferences({});

function appendRow(target, values) {
  const row = document.createElement("tr");
  for (const value of values) {
    const cell = document.createElement("td");
    if (value instanceof Node) cell.append(value); else cell.textContent = String(value);
    row.append(cell);
  }
  target?.append(row);
}

async function persistPreferences(patch) {
  const stored = await getSafeStorage(["uiPreferences"]);
  const existing = stored.uiPreferences && typeof stored.uiPreferences === "object" ? stored.uiPreferences : {};
  await setSafeStorage({ uiPreferences: { ...existing, ...patch } });
}

function applyGroupState(groupElement, collapsed) {
  groupElement.classList.toggle("collapsed", collapsed);
  const toggle = groupElement.querySelector(".nav-group-toggle");
  toggle.setAttribute("aria-expanded", String(!collapsed));
}

function activateRoute(routeId, { persist = true } = {}) {
  const resolved = resolveAdminRoute(routeId);
  document.querySelectorAll("[data-admin-route]").forEach((section) => section.classList.toggle("active", section.dataset.adminRoute === resolved.route));
  document.querySelectorAll("[data-admin-nav]").forEach((button) => {
    const active = button.dataset.adminNav === resolved.route;
    button.classList.toggle("active", active);
    active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current");
  });
  document.querySelector("#breadcrumb-group").textContent = resolved.groupLabel;
  document.querySelector("#breadcrumb-page").textContent = resolved.label;
  document.querySelector("#page-title").textContent = resolved.label;
  document.body.classList.remove("nav-open");
  document.querySelector("#mobile-menu").setAttribute("aria-expanded", "false");
  if (persist) void persistPreferences({ selectedAdminRoute: resolved.route });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderNavigation() {
  const navigation = document.querySelector("#admin-navigation");
  navigation.replaceChildren();
  for (const group of ADMIN_NAVIGATION) {
    const groupElement = el("section", "nav-group");
    groupElement.dataset.navGroup = group.id;
    const toggle = el("button", "nav-group-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "true");
    toggle.append(el("span", "", group.label), el("span", "chevron", "⌄"));
    const items = el("div", "nav-group-items");
    items.id = `nav-group-${group.id}`;
    toggle.setAttribute("aria-controls", items.id);
    toggle.addEventListener("click", () => {
      uiPreferences = toggleCollapsedGroup(uiPreferences, group.id);
      applyGroupState(groupElement, uiPreferences.collapsedAdminGroups.includes(group.id));
      void persistPreferences({ collapsedAdminGroups: [...uiPreferences.collapsedAdminGroups] });
    });
    for (const route of group.routes) {
      const button = el("button", "nav-item");
      button.type = "button";
      button.dataset.adminNav = route.id;
      button.title = route.label;
      button.append(el("span", "nav-icon", route.icon), el("span", "nav-label", route.label));
      button.addEventListener("click", () => activateRoute(route.id));
      items.append(button);
    }
    groupElement.append(toggle, items);
    applyGroupState(groupElement, uiPreferences.collapsedAdminGroups.includes(group.id));
    navigation.append(groupElement);
  }
}

function renderAdminData() {
  const binding = consoleData.bindings[0];
  const times = ["今天 09:41", "今天 09:41"];
  consoleData.activity.forEach((entry, index) => {
    appendRow(document.querySelector("#overview-activity"), [entry.label, entry.text, entry.result, times[index]]);
    appendRow(document.querySelector("#message-table"), [times[index], entry.label, entry.text, entry.result, binding.bindingKey]);
  });

  const accountAction = el("button", "table-action", "查看");
  accountAction.type = "button";
  accountAction.addEventListener("click", () => activateRoute("bindings"));
  appendRow(document.querySelector("#account-table"), [binding.bindingKey, binding.provider, binding.environment, binding.status, binding.webhookVerification, accountAction]);

  const hierarchy = [
    ["Tenant", consoleData.tenant.key, "—", "Active"],
    ["Application", consoleData.applications[0].key, consoleData.tenant.key, "Active"],
    ["Channel Binding", binding.bindingKey, consoleData.applications[0].key, binding.status],
    ["LINE OA", binding.provider, binding.bindingKey, "Connected"],
  ];
  hierarchy.forEach((row) => appendRow(document.querySelector("#application-hierarchy"), row));

  const fields = {
    "Binding Key": binding.bindingKey,
    Tenant: consoleData.tenant.name,
    Application: consoleData.applications[0].name,
    Provider: binding.provider,
    Environment: binding.environment,
    "Credential storage": binding.credentialStorage,
    "Verification state": binding.webhookVerification,
    "Last verified": binding.lastVerification,
  };
  const descriptionList = document.querySelector("#binding-fields");
  Object.entries(fields).forEach(([label, value]) => descriptionList.append(el("dt", "", label), el("dd", "", value)));
  document.querySelector("#webhook-url").value = binding.webhookUrl;
  document.querySelector("#health-url").value = binding.healthUrl;
  document.querySelector("#health-link").href = binding.healthUrl;
  document.querySelector("#webhook-last-verification").textContent = binding.lastVerification;
  binding.securityControls.forEach((item) => document.querySelector("#binding-security").append(el("li", "", item)));

  consoleData.auditEntries.forEach((entry, index) => {
    appendRow(document.querySelector("#audit-table"), [entry.occurredAt, entry.action, entry.resource, entry.actor, entry.result]);
    if (index < 3) appendRow(document.querySelector("#overview-operations"), [entry.occurredAt, entry.action, entry.resource, entry.result]);
  });
  consoleData.limitations.forEach((item) => document.querySelector("#limitations").append(el("li", "", item)));
  document.querySelectorAll("[data-route-target]").forEach((button) => button.addEventListener("click", () => activateRoute(button.dataset.routeTarget)));
}

async function initializeNavigation() {
  const stored = await getSafeStorage(["uiPreferences"]);
  uiPreferences = normalizeAdminPreferences(stored.uiPreferences);
  renderNavigation();
  document.body.classList.toggle("sidebar-compact", uiPreferences.adminSidebarCompact);
  document.querySelector("#sidebar-toggle").setAttribute("aria-expanded", String(!uiPreferences.adminSidebarCompact));
  const selected = stored.uiPreferences?.selectedAdminRoute;
  activateRoute(selected, { persist: false });
}

renderAdminData();
bindCopyWebhook(document);
bindRuntimeActions(document);
bindCurrentOaControls(document);
bindSharedShellSynchronization(document, { onRouteChange: (route) => activateRoute(route, { persist: false }) });
document.querySelector("#webhook-refresh").addEventListener("click", () => void refreshHealth(document));
document.querySelector("#return-line").addEventListener("click", async (event) => {
  const result = await chrome.runtime.sendMessage({ type: MessageType.RETURN_TO_LINE });
  if (!result?.ok) event.currentTarget.disabled = true;
});
document.querySelector("#open-side-panel").addEventListener("click", async (event) => {
  const result = await chrome.runtime.sendMessage({ type: MessageType.OPEN_PANEL });
  if (!result?.ok) event.currentTarget.textContent = "側邊欄目前不可用";
});
document.querySelector("#sidebar-toggle").addEventListener("click", () => {
  const compact = !document.body.classList.contains("sidebar-compact");
  document.body.classList.toggle("sidebar-compact", compact);
  document.querySelector("#sidebar-toggle").setAttribute("aria-expanded", String(!compact));
  uiPreferences = Object.freeze({ ...uiPreferences, adminSidebarCompact: compact });
  void persistPreferences({ adminSidebarCompact: compact });
});
document.querySelector("#mobile-menu").addEventListener("click", (event) => {
  const open = !document.body.classList.contains("nav-open");
  document.body.classList.toggle("nav-open", open);
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

void initializeNavigation();
void initializeSharedShellState(document);
void refreshContext(document);
void refreshHealth(document);