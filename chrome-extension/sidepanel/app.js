import { AI_LAB_URL, CHANNEL_LAB_URL, PRIMARY_VIEWS, WORKBENCH_URL } from "../shared/constants.js";
import { MessageType } from "../shared/messages.js";
import { getSafeStorage, setSafeStorage } from "../shared/storage.js";
import { consoleData } from "./data.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

async function showView(view) {
  const selected = PRIMARY_VIEWS.includes(view) ? view : "home";
  document.querySelectorAll("[data-view]").forEach((section) => section.classList.toggle("active", section.dataset.view === selected));
  document.querySelectorAll("[data-nav]").forEach((button) => button.classList.toggle("active", button.dataset.nav === selected));
  await setSafeStorage({ selectedView: selected });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderActivity(targetSelector, compact = false) {
  const target = document.querySelector(targetSelector);
  for (const item of consoleData.activity) {
    const row = el("div", `activity-row ${item.type}`);
    row.append(el("span", "activity-icon", item.type === "received" ? "↓" : "↑"));
    const copy = el("div");
    copy.append(el("strong", "", item.label), el("p", "", item.text));
    row.append(copy, el("span", "activity-result", item.result));
    target.append(row);
    if (compact) break;
  }
}

function renderProductData() {
  const quickActions = document.querySelector("#quick-actions");
  consoleData.quickActions.forEach((item) => {
    const button = el("button", "action-card");
    button.type = "button";
    button.dataset.go = item.view;
    button.append(el("span", "action-symbol", item.view === "accounts" ? "◎" : item.view === "messages" ? "◌" : "▦"), el("strong", "", item.label), el("span", "action-arrow", "→"));
    quickActions.append(button);
  });

  const binding = consoleData.bindings[0];
  const accountCard = el("article", "account-card card");
  const accountTop = el("div", "account-top");
  accountTop.append(el("span", "oa-logo", "OA"));
  const accountCopy = el("div");
  accountCopy.append(el("strong", "", binding.bindingKey), el("p", "", `${binding.provider} · ${binding.environment}`));
  accountTop.append(accountCopy, el("span", "success-pill", binding.status));
  const proofs = el("div", "proof-grid");
  [["Webhook verification", binding.webhookVerification], ["Real reply", binding.realReply]].forEach(([label, value]) => {
    const proof = el("div"); proof.append(el("span", "", label), el("strong", "", `✓ ${value}`)); proofs.append(proof);
  });
  const detailButton = el("button", "primary-button", "查看 Binding 詳情");
  detailButton.type = "button";
  detailButton.addEventListener("click", () => { document.querySelector("#binding-detail").hidden = false; document.querySelector("#binding-detail").scrollIntoView({ behavior: "smooth" }); });
  accountCard.append(accountTop, proofs, detailButton);
  document.querySelector("#account-list").append(accountCard);

  const fields = {
    "Binding key": binding.bindingKey,
    Tenant: consoleData.tenant.name,
    Application: consoleData.applications[0].name,
    Provider: binding.provider,
    Environment: binding.environment,
    "Credential storage": binding.credentialStorage,
    "Last verification": binding.lastVerification,
  };
  const dl = document.querySelector("#binding-fields");
  Object.entries(fields).forEach(([label, value]) => dl.append(el("dt", "", label), el("dd", "", value)));
  const webhook = document.querySelector("#webhook-url");
  webhook.value = binding.webhookUrl;
  document.querySelector("#health-link").href = binding.healthUrl;
  binding.securityControls.forEach((item) => document.querySelector("#binding-security").append(el("li", "", item)));

  renderActivity("#home-activity", true);
  renderActivity("#message-proof");

  const applicationList = document.querySelector("#application-list");
  consoleData.applications.forEach((application) => {
    const card = el("article", "application-card card");
    card.append(el("span", "app-icon", "AP"));
    const copy = el("div"); copy.append(el("strong", "", application.name), el("p", "", `${consoleData.tenant.name} · ${application.bindingKeys.length} binding`));
    card.append(copy, el("span", "soft-pill", "Active"));
    applicationList.append(card);
  });
  const hierarchy = document.querySelector("#hierarchy");
  consoleData.applications[0].hierarchy.forEach((item, index, items) => {
    hierarchy.append(el("span", "hierarchy-node", item));
    if (index < items.length - 1) hierarchy.append(el("span", "hierarchy-arrow", "→"));
  });
  consoleData.limitations.forEach((item) => document.querySelector("#limitations").append(el("li", "", item)));
}

async function refreshContext() {
  try {
    const result = await chrome.runtime.sendMessage({ type: MessageType.GET_CONTEXT });
    const labels = { line_oa_manager: "LINE OA Manager", line_chat: "LINE Chat", other: "Other page" };
    const context = result?.context ?? { pageType: "other", pathnameCategory: "other" };
    document.querySelector("#context-badge").textContent = labels[context.pageType] ?? labels.other;
    document.querySelector("#context-detail").textContent = context.pageType === "other"
      ? "Open LINE OA Manager or LINE Chat to see bounded page context."
      : `${context.pathnameCategory} page · No private page data collected`;
  } catch { /* side panel remains useful without page context */ }
}

async function refreshHealth() {
  const value = document.querySelector("#health-value");
  const note = document.querySelector("#health-note");
  value.textContent = "Checking";
  try {
    const result = await chrome.runtime.sendMessage({ type: MessageType.CHECK_HEALTH });
    value.textContent = result?.ok && result.health?.status === "ok" ? "Online" : "Unavailable";
    note.textContent = result?.ok ? "Bounded health response" : (result?.reasonCode ?? "HEALTH_OFFLINE");
    document.querySelector("#settings-health").textContent = value.textContent;
  } catch {
    value.textContent = "Offline";
    note.textContent = "HEALTH_OFFLINE";
    document.querySelector("#settings-health").textContent = "Offline";
  }
}

document.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => void showView(button.dataset.nav)));
document.addEventListener("click", (event) => { const target = event.target.closest("[data-go]"); if (target) void showView(target.dataset.go); });
document.querySelector("#copy-webhook").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  try { await navigator.clipboard.writeText(document.querySelector("#webhook-url").value); button.textContent = "已複製"; }
  catch { document.querySelector("#webhook-url").select(); button.textContent = "請手動複製"; }
  setTimeout(() => { button.textContent = "複製"; }, 1500);
});
document.querySelector("#refresh-health").addEventListener("click", () => void refreshHealth());
document.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => {
  const destinations = { workbench: WORKBENCH_URL, aiLab: AI_LAB_URL, channelLab: CHANNEL_LAB_URL };
  const url = destinations[button.dataset.tool];
  if (url) chrome.tabs.create({ url });
}));

renderProductData();
getSafeStorage(["selectedView"]).then(({ selectedView }) => showView(selectedView)).catch(() => showView("home"));
void refreshContext();
void refreshHealth();
