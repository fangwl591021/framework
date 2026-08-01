import { ADMIN_NAVIGATION, normalizeAdminPreferences, resolveAdminRoute, toggleCollapsedGroup } from "../shared/admin-navigation.js";
import { LocalDevelopmentAuthAdapter, forgotPasswordPlaceholder } from "../shared/auth-adapter.js";
import { LocalCredentialRegistrationAdapter, assertCredentialReceiptSafe } from "../shared/credential-adapter.js";
import { LocalLineIntegrationAdapter, normalizeIntegrationInput } from "../shared/integration-adapter.js";
import { bindRuntimeActions, refreshContext, refreshHealth } from "../shared/console-runtime.js";
import { el } from "../shared/console-ui.js";
import { MessageType } from "../shared/messages.js";
import { PlatformLifecycle, applyIntegrationVerification, configureLineIntegration, createPlatformSnapshot, createWorkspaceForOwner, evaluatePlatformLifecycle, projectAuthenticatedPlatform, saveLineIntegrationDraft, selectBinding, selectWorkspace, withoutSession } from "../shared/platform-model.js";
import { loadPlatformState, savePlatformState } from "../shared/platform-store.js";
import { createLocalDemoSnapshot } from "../shared/product-data.js";
import { getSafeStorage, setSafeStorage } from "../shared/storage.js";
import { LocalIntegrationVerificationAdapter } from "../shared/verification-adapter.js";

const authAdapter = new LocalDevelopmentAuthAdapter();
const credentialAdapter = new LocalCredentialRegistrationAdapter();
const integrationAdapter = new LocalLineIntegrationAdapter(credentialAdapter);
const verificationAdapter = new LocalIntegrationVerificationAdapter();
let snapshot = createPlatformSnapshot();
let uiPreferences = normalizeAdminPreferences({});

function text(selector, value) { const node = document.querySelector(selector); if (node) node.textContent = String(value ?? ""); }
function clear(target) { target?.replaceChildren(); }
function appendRow(target, values) { const row = document.createElement("tr"); for (const value of values) row.append(el("td", "", value)); target.append(row); }
function setFormBusy(form, busy) { form.setAttribute("aria-busy", String(busy)); form.querySelectorAll("button").forEach((button) => { button.disabled = busy; }); }
function setInputValue(form, name, value) { const control = form.elements.namedItem(name); if (control) control.value = String(value ?? ""); }
function clearCredentialControls(form) { for (const name of ["lineLoginChannelSecret", "messagingChannelSecret", "channelAccessToken"]) setInputValue(form, name, ""); }
function renderEndpointState(fieldSelector, buttonSelector, noteSelector, url) { const field = document.querySelector(fieldSelector); const button = document.querySelector(buttonSelector); const note = document.querySelector(noteSelector); field.value = url ?? "尚未建立"; button.disabled = !url; note.hidden = Boolean(url); note.textContent = url ? "" : "平台後端尚未提供此端點"; }

async function persistPreferences(patch) {
  const stored = await getSafeStorage(["uiPreferences"]);
  const existing = stored.uiPreferences && typeof stored.uiPreferences === "object" ? stored.uiPreferences : {};
  await setSafeStorage({ uiPreferences: { ...existing, ...patch } });
}
async function persistSnapshot(next) { snapshot = await savePlatformState(next); renderPlatform(); }

function showAuthMode(mode) {
  const register = mode === "register";
  document.querySelector("#sign-in-form").hidden = register;
  document.querySelector("#register-form").hidden = !register;
  document.querySelector("#show-sign-in").classList.toggle("active", !register);
  document.querySelector("#show-register").classList.toggle("active", register);
  document.querySelector("#show-sign-in").setAttribute("aria-selected", String(!register));
  document.querySelector("#show-register").setAttribute("aria-selected", String(register));
  text("#auth-title", register ? "建立平台帳號" : "登入管理平台");
  text("#auth-message", "");
}
function lifecycleMessage(lifecycle) {
  return ({
    [PlatformLifecycle.AUTHENTICATED_WITHOUT_WORKSPACE]: "帳號已建立。請先建立 Workspace，才能設定 LINE OA 整合。",
    [PlatformLifecycle.AUTHENTICATED_WITHOUT_BINDING]: "Workspace 已就緒。請在同一頁完成 LINE Login、Messaging API 與 Webhook 設定。",
    [PlatformLifecycle.BINDING_PENDING_VERIFICATION]: "LINE 整合已安全保存為 reference-only 狀態，等待本機確定性驗證。",
    [PlatformLifecycle.ACTIVE]: "目前 Workspace 與 LINE OA 整合已啟用。所有資料均由授權 Membership 範圍投影。",
    [PlatformLifecycle.SESSION_EXPIRED]: "工作階段已過期，請重新登入。",
    [PlatformLifecycle.ACCOUNT_SUSPENDED]: "帳號已停權，平台資料與操作均不可用。",
  })[lifecycle] ?? "請登入平台。";
}
function routeIsAvailable(route, lifecycle) {
  if (lifecycle === PlatformLifecycle.ACTIVE) return route.availability !== "not_entitled";
  return route.id === "line-integration" && [PlatformLifecycle.AUTHENTICATED_WITHOUT_BINDING, PlatformLifecycle.BINDING_PENDING_VERIFICATION].includes(lifecycle);
}
function applyGroupState(groupElement, collapsed) { groupElement.classList.toggle("collapsed", collapsed); groupElement.querySelector(".nav-group-toggle").setAttribute("aria-expanded", String(!collapsed)); }
function activateRoute(routeId, { persist = true } = {}) {
  const lifecycle = evaluatePlatformLifecycle(snapshot);
  const resolved = resolveAdminRoute(routeId);
  const route = routeIsAvailable(resolved, lifecycle) ? resolved.route : (lifecycle === PlatformLifecycle.ACTIVE ? "overview" : "line-integration");
  const activeResolved = resolveAdminRoute(route);
  document.querySelectorAll("[data-admin-route]").forEach((section) => section.classList.toggle("active", section.dataset.adminRoute === route));
  document.querySelectorAll("[data-admin-nav]").forEach((button) => { const active = button.dataset.adminNav === route; button.classList.toggle("active", active); active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current"); });
  text("#breadcrumb-group", activeResolved.groupLabel); text("#breadcrumb-page", activeResolved.label); text("#page-title", activeResolved.label);
  document.body.classList.remove("nav-open"); document.querySelector("#mobile-menu").setAttribute("aria-expanded", "false");
  if (persist) void persistPreferences({ selectedAdminRoute: route });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderNavigation(lifecycle) {
  const navigation = document.querySelector("#admin-navigation"); navigation.replaceChildren();
  navigation.hidden = lifecycle !== PlatformLifecycle.ACTIVE;
  if (navigation.hidden) return;
  for (const group of ADMIN_NAVIGATION) {
    const groupElement = el("section", "nav-group"); groupElement.dataset.navGroup = group.id;
    const toggle = el("button", "nav-group-toggle"); toggle.type = "button"; toggle.setAttribute("aria-expanded", "true"); toggle.append(el("span", "", group.label), el("span", "chevron", "⌄"));
    const items = el("div", "nav-group-items"); items.id = `nav-group-${group.id}`; toggle.setAttribute("aria-controls", items.id);
    toggle.addEventListener("click", () => { uiPreferences = toggleCollapsedGroup(uiPreferences, group.id); applyGroupState(groupElement, uiPreferences.collapsedAdminGroups.includes(group.id)); void persistPreferences({ collapsedAdminGroups: [...uiPreferences.collapsedAdminGroups] }); });
    for (const route of group.routes) {
      const button = el("button", "nav-item"); button.type = "button"; button.dataset.adminNav = route.id; button.disabled = !routeIsAvailable(route, lifecycle); button.title = button.disabled ? "目前 Workspace 尚未取得此功能" : route.label;
      button.append(el("span", "nav-icon", route.icon), el("span", "nav-label", route.label)); button.addEventListener("click", () => activateRoute(route.id)); items.append(button);
    }
    groupElement.append(toggle, items); applyGroupState(groupElement, uiPreferences.collapsedAdminGroups.includes(group.id)); navigation.append(groupElement);
  }
}
function authorizedWorkspaces() {
  const refs = new Set(snapshot.memberships.filter((entry) => entry.userRef === snapshot.session?.userRef && entry.status === "active").map((entry) => entry.workspaceRef));
  return snapshot.workspaces.filter((entry) => refs.has(entry.workspaceRef) && entry.status === "active");
}
function renderWorkspaceOptions(view) {
  for (const selector of ["#workspace-switcher", "#integration-workspace-select"]) {
    const select = document.querySelector(selector); clear(select);
    for (const workspace of authorizedWorkspaces()) { const option = el("option", "", workspace.name); option.value = workspace.workspaceRef; option.selected = workspace.workspaceRef === view.workspace.workspaceRef; select.append(option); }
  }
}
function renderBindingSwitcher(view) {
  const select = document.querySelector("#binding-switcher"); clear(select);
  if (!view.bindings.length) { const option = el("option", "", "尚未設定"); option.value = ""; select.append(option); select.disabled = true; return; }
  select.disabled = false;
  for (const binding of view.bindings) { const integration = snapshot.lineIntegrations.find((entry) => entry.integrationRef === binding.integrationRef); const option = el("option", "", integration?.displayName ?? binding.bindingKey); option.value = binding.bindingRef; option.selected = binding.bindingRef === view.currentBinding?.bindingRef; select.append(option); }
}
function renderIntegration(view) {
  const form = document.querySelector("#line-integration-form"); renderWorkspaceOptions(view); renderBindingSwitcher(view);
  const configured = Boolean(view.currentBinding && view.integration); text("#integration-configured-badge", configured ? "本機資料已設定" : "尚未設定");
  if (view.integration) {
    setInputValue(form, "displayName", view.integration.displayName); setInputValue(form, "lineBotAccount", view.integration.lineBotAccount); setInputValue(form, "environment", view.integration.environment); setInputValue(form, "note", view.integration.note);
    setInputValue(form, "lineLoginChannelId", view.loginChannel?.channelId); setInputValue(form, "messagingChannelId", view.messagingChannel?.channelId);
  }
  clearCredentialControls(form);
  renderEndpointState("#callback-url", "#copy-callback", "#callback-endpoint-note", view.loginChannel?.callbackUrl ?? null);
  renderEndpointState("#webhook-url", "#copy-webhook", "#webhook-endpoint-note", view.messagingChannel?.webhookUrl ?? null);
  const verification = view.verificationResults.find((entry) => entry.integrationRef === view.integration?.integrationRef);
  const loginStatus = view.loginChannel?.verificationStatus ?? "not_configured";
  const messagingStatus = view.messagingChannel?.messagingVerification ?? "not_configured";
  const webhookStatus = view.messagingChannel?.webhookVerification ?? "not_configured";
  const overallStatus = view.currentBinding?.overallStatus ?? "not_configured";
  for (const selector of ["#login-status", "#summary-login-status"]) text(selector, loginStatus);
  for (const selector of ["#messaging-status", "#summary-messaging-status"]) text(selector, messagingStatus);
  for (const selector of ["#webhook-status", "#summary-webhook-status"]) text(selector, webhookStatus);
  text("#credential-status", view.credentialReference?.credentialStatus ?? "尚未設定");
  text("#credential-updated", view.credentialReference ? `Local reference only · Updated ${new Date(view.credentialReference.updatedAt).toISOString()}` : "只保存 opaque reference");
  text("#overall-integration-status", verification?.overallStatus ?? overallStatus);
  text("#submit-integration", configured ? "更新憑證" : "儲存並驗證全部");
  document.querySelector("#reverify-integration").hidden = !configured;
  document.querySelector("#complete-integration").hidden = overallStatus !== "active";
}
function renderAdmin(view) {
  text("#summary-workspace", view.workspace.name); text("#summary-role", view.membership.role); text("#summary-binding", view.integration?.displayName ?? "Not configured"); text("#summary-verification", view.currentBinding?.overallStatus ?? "Not configured");
  text("#settings-name", view.user.displayName); text("#settings-email", view.user.email); text("#settings-role", view.membership.role);
  const accounts = document.querySelector("#account-table"); clear(accounts);
  for (const binding of view.bindings) { const integration = snapshot.lineIntegrations.find((entry) => entry.integrationRef === binding.integrationRef); appendRow(accounts, [integration?.displayName ?? binding.bindingKey, binding.bindingKey, integration?.lineBotAccount ?? "", integration?.environment ?? "", binding.overallStatus]); }
  const applications = document.querySelector("#application-table"); clear(applications); appendRow(applications, ["Workspace", view.workspace.name, view.membership.role]); for (const entry of view.applications) appendRow(applications, ["Application", entry.name, entry.status]);
  const entitlements = document.querySelector("#usage-list"); clear(entitlements); for (const entry of view.entitlements) entitlements.append(el("div", "simple-list-row", `${entry.featureKey} · ${entry.status}`));
  const memberships = document.querySelector("#team-permission-table"); clear(memberships); snapshot.memberships.filter((entry) => entry.workspaceRef === view.workspace.workspaceRef).forEach((entry) => appendRow(memberships, [entry.userRef, entry.workspaceRef, entry.role, entry.status]));
  const audit = document.querySelector("#audit-table"); clear(audit); for (const entry of view.auditEvents) appendRow(audit, [entry.action, entry.workspaceRef, entry.result]);
}
function renderPlatform() {
  const lifecycle = evaluatePlatformLifecycle(snapshot); const authVisible = lifecycle === PlatformLifecycle.UNAUTHENTICATED || lifecycle === PlatformLifecycle.SESSION_EXPIRED;
  document.querySelector("#auth-shell").hidden = !authVisible; document.querySelector("#platform-shell").hidden = authVisible;
  if (authVisible) { showAuthMode("sign-in"); if (lifecycle === PlatformLifecycle.SESSION_EXPIRED) text("#auth-message", "SESSION_EXPIRED · 請重新登入"); return; }
  const user = snapshot.users.find((entry) => entry.userRef === snapshot.session?.userRef);
  text("#profile-name", user?.displayName ?? "Platform User"); text("#profile-email", user?.email ?? ""); text("#sidebar-user-name", user?.displayName ?? "Platform User"); text("#lifecycle-banner", lifecycleMessage(lifecycle));
  document.querySelector("#suspended-view").hidden = lifecycle !== PlatformLifecycle.ACCOUNT_SUSPENDED;
  document.querySelector("#workspace-onboarding").hidden = true; document.querySelector("#line-integration-page").classList.remove("active"); document.querySelector("#admin-content").hidden = true; renderNavigation(lifecycle);
  if (lifecycle === PlatformLifecycle.ACCOUNT_SUSPENDED) return;
  if (lifecycle === PlatformLifecycle.AUTHENTICATED_WITHOUT_WORKSPACE) { document.querySelector("#workspace-onboarding").hidden = false; return; }
  const view = projectAuthenticatedPlatform(snapshot); renderWorkspaceOptions(view); renderBindingSwitcher(view); text("#sidebar-user-role", view.membership.role); renderIntegration(view);
  if (lifecycle !== PlatformLifecycle.ACTIVE) { document.querySelector("#line-integration-page").classList.add("active"); text("#breadcrumb-group", "平台管理"); text("#breadcrumb-page", "LINE OA 串接"); text("#page-title", "LINE OA 串接"); return; }
  document.querySelector("#admin-content").hidden = false; renderAdmin(view); activateRoute(uiPreferences.selectedAdminRoute ?? "overview", { persist: false });
}

document.querySelector("#show-sign-in").addEventListener("click", () => showAuthMode("sign-in"));
document.querySelector("#show-register").addEventListener("click", () => showAuthMode("register"));
document.querySelector("#forgot-password").addEventListener("click", () => { const result = forgotPasswordPlaceholder(new FormData(document.querySelector("#sign-in-form")).get("email")); text("#auth-message", result.emailAccepted ? "密碼重設需要正式 Authentication API" : "請先輸入有效電子郵件"); });
document.querySelector("#register-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setFormBusy(form, true);
  const result = await authAdapter.register({ displayName: data.get("displayName"), email: data.get("email"), password: data.get("password"), confirmPassword: data.get("confirmPassword"), termsAccepted: data.get("termsAccepted") === "on" }, snapshot.users);
  form.reset(); setFormBusy(form, false); if (!result.ok) { text("#auth-message", result.reasonCodes.join(" · ")); return; }
  await persistSnapshot(createPlatformSnapshot({ ...snapshot, users: [...snapshot.users, result.user], session: result.session }));
});
document.querySelector("#sign-in-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setFormBusy(form, true);
  const result = await authAdapter.signIn({ email: data.get("email"), password: data.get("password"), simulation: data.get("simulation") }, snapshot.users);
  form.reset(); setFormBusy(form, false); if (!result.ok) { text("#auth-message", result.reasonCodes.join(" · ")); return; }
  if (Number(result.session.expiresAt) <= Date.now()) { snapshot = createPlatformSnapshot(); await savePlatformState(snapshot); renderPlatform(); text("#auth-message", "SESSION_EXPIRED · 請重新登入"); return; }
  const next = result.demoSeedRequired ? createLocalDemoSnapshot(result.session, result.user) : createPlatformSnapshot({ ...snapshot, users: [...snapshot.users.filter((entry) => entry.userRef !== result.user.userRef), result.user], session: result.session });
  await persistSnapshot(next);
});
async function signOut() { await authAdapter.signOut(); await persistSnapshot(withoutSession(snapshot)); }
document.querySelector("#sign-out").addEventListener("click", signOut); document.querySelector("#logout-route-action").addEventListener("click", signOut);
document.querySelector("#workspace-form").addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const next = createWorkspaceForOwner(snapshot, { name: data.get("name"), businessDisplayName: data.get("businessDisplayName") }); form.reset(); await persistSnapshot(next); });
document.querySelector("#save-integration-metadata").addEventListener("click", async () => {
  const form = document.querySelector("#line-integration-form"); const data = new FormData(form); const view = projectAuthenticatedPlatform(snapshot);
  try {
    const metadata = normalizeIntegrationInput({ workspaceRef: data.get("workspaceRef"), applicationRef: view.applications[0]?.applicationRef, displayName: data.get("displayName"), lineBotAccount: data.get("lineBotAccount"), environment: data.get("environment"), note: data.get("note"), lineLoginChannelId: data.get("lineLoginChannelId"), messagingChannelId: data.get("messagingChannelId") });
    clearCredentialControls(form); await persistSnapshot(saveLineIntegrationDraft(snapshot, metadata)); text("#integration-message", "草稿已保存；未保存任何 Secret 或 Access Token。");
  } catch (error) { clearCredentialControls(form); text("#integration-message", error.reasonCodes?.join(" · ") ?? error.message); }
});
document.querySelector("#line-integration-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setFormBusy(form, true);
  try {
    const scoped = projectAuthenticatedPlatform(snapshot, String(data.get("workspaceRef") ?? ""));
    const result = await integrationAdapter.configure({ workspaceRef: scoped.workspace.workspaceRef, applicationRef: scoped.applications[0]?.applicationRef, displayName: data.get("displayName"), lineBotAccount: data.get("lineBotAccount"), environment: data.get("environment"), note: data.get("note"), lineLoginChannelId: data.get("lineLoginChannelId"), messagingChannelId: data.get("messagingChannelId") }, { lineLoginChannelSecret: data.get("lineLoginChannelSecret"), messagingChannelSecret: data.get("messagingChannelSecret"), channelAccessToken: data.get("channelAccessToken") });
    assertCredentialReceiptSafe(result.receipt); snapshot = configureLineIntegration(selectWorkspace(snapshot, scoped.workspace.workspaceRef), result.receipt, result.metadata); const verification = await verificationAdapter.verify({ credentialReference: result.receipt.credentialReference, bindingKey: result.receipt.bindingKey, callbackUrl: result.receipt.callbackUrl, webhookUrl: result.receipt.webhookUrl }); snapshot = applyIntegrationVerification(snapshot, snapshot.currentBindingRef, verification); await savePlatformState(snapshot); clearCredentialControls(form); renderPlatform(); activateRoute("line-integration"); text("#integration-message", `本機輸入已驗證，但平台端點尚未完成：${verification.reasonCodes.join(" · ")}`);
  } catch (error) { clearCredentialControls(form); text("#integration-message", error.reasonCodes?.join(" · ") ?? error.reasonCode ?? error.message); }
  finally { setFormBusy(form, false); }
});
document.querySelector("#reverify-integration").addEventListener("click", async () => {
  const view = projectAuthenticatedPlatform(snapshot);
  try { const result = await verificationAdapter.verify({ credentialReference: view.credentialReference?.credentialReference, bindingKey: view.currentBinding?.bindingKey, callbackUrl: view.loginChannel?.callbackUrl, webhookUrl: view.messagingChannel?.webhookUrl }); await persistSnapshot(applyIntegrationVerification(snapshot, view.currentBinding.bindingRef, result)); text("#integration-message", result.overallStatus === "active" ? "Integration verified." : `尚未完成：${result.reasonCodes.join(" · ")}`); }
  catch (error) { text("#integration-message", error.reasonCode ?? error.message); }
});
document.querySelector("#complete-integration").addEventListener("click", () => activateRoute("overview"));
document.querySelector("#workspace-switcher").addEventListener("change", async (event) => { await persistSnapshot(selectWorkspace(snapshot, event.currentTarget.value)); });
document.querySelector("#integration-workspace-select").addEventListener("change", async (event) => { await persistSnapshot(selectWorkspace(snapshot, event.currentTarget.value)); });
document.querySelector("#binding-switcher").addEventListener("change", async (event) => { if (event.currentTarget.value) await persistSnapshot(selectBinding(snapshot, event.currentTarget.value)); });
document.querySelector("#copy-callback").addEventListener("click", async () => { const value = document.querySelector("#callback-url").value; if (/^https:\/\//.test(value)) await navigator.clipboard.writeText(value); });
document.querySelector("#copy-webhook").addEventListener("click", async () => { const value = document.querySelector("#webhook-url").value; if (/^https:\/\//.test(value)) await navigator.clipboard.writeText(value); });
document.querySelector("#return-line").addEventListener("click", async (event) => { const result = await chrome.runtime.sendMessage({ type: MessageType.RETURN_TO_LINE }); if (!result?.ok) event.currentTarget.disabled = true; });
document.querySelector("#sidebar-toggle").addEventListener("click", () => { const compact = !document.body.classList.contains("sidebar-compact"); document.body.classList.toggle("sidebar-compact", compact); document.querySelector("#sidebar-toggle").setAttribute("aria-expanded", String(!compact)); uiPreferences = Object.freeze({ ...uiPreferences, adminSidebarCompact: compact }); void persistPreferences({ adminSidebarCompact: compact }); });
document.querySelector("#mobile-menu").addEventListener("click", (event) => { const open = !document.body.classList.contains("nav-open"); document.body.classList.toggle("nav-open", open); event.currentTarget.setAttribute("aria-expanded", String(open)); });

bindRuntimeActions(document);
void (async () => { const stored = await getSafeStorage(["uiPreferences"]); uiPreferences = Object.freeze({ ...normalizeAdminPreferences(stored.uiPreferences), selectedAdminRoute: stored.uiPreferences?.selectedAdminRoute }); snapshot = await loadPlatformState(); const expiredOnLoad = evaluatePlatformLifecycle(snapshot) === PlatformLifecycle.SESSION_EXPIRED; if (expiredOnLoad) { snapshot = createPlatformSnapshot(); await savePlatformState(snapshot); } renderPlatform(); if (expiredOnLoad) text("#auth-message", "SESSION_EXPIRED · 請重新登入"); await refreshContext(document); await refreshHealth(document); })();
