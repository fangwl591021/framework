import { ADMIN_GROUP_IDS, ADMIN_ROUTE_IDS } from "./admin-navigation.js";
import { assertNoSensitiveFields } from "./sanitizer.js";

export const ALLOWED_STORAGE_KEYS = Object.freeze([
  "uiPreferences",
  "lastHealthSummary",
  "lastPageContext",
  "originatingTab",
  "floatingLauncherExpanded",
  "floatingLauncherHiddenHosts",
  "platformState",
]);

const FLOATING_LAUNCHER_HOSTS = Object.freeze(["manager.line.biz", "chat.line.biz"]);
const LEGACY_ADMIN_ROUTES = Object.freeze(["paid-broadcast", "bindings", "webhook"]);
const SAFE_ADMIN_ROUTES = new Set([...ADMIN_ROUTE_IDS, ...LEGACY_ADMIN_ROUTES]);
const SAFE_ADMIN_GROUPS = new Set([...ADMIN_GROUP_IDS, "tools", "system", "growth"]);

function validateKnownValue(key, value) {
  if (key === "uiPreferences") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("STORAGE_VALUE_INVALID");
    const allowed = ["selectedAdminRoute", "adminSidebarCompact", "collapsedAdminGroups"];
    if (Object.keys(value).some((entry) => !allowed.includes(entry))) throw new Error("STORAGE_VALUE_INVALID");
    if (value.selectedAdminRoute !== undefined && !SAFE_ADMIN_ROUTES.has(value.selectedAdminRoute)) throw new Error("STORAGE_VALUE_INVALID");
    if (value.adminSidebarCompact !== undefined && typeof value.adminSidebarCompact !== "boolean") throw new Error("STORAGE_VALUE_INVALID");
    if (value.collapsedAdminGroups !== undefined && (!Array.isArray(value.collapsedAdminGroups) || new Set(value.collapsedAdminGroups).size !== value.collapsedAdminGroups.length || value.collapsedAdminGroups.some((entry) => !SAFE_ADMIN_GROUPS.has(entry)))) throw new Error("STORAGE_VALUE_INVALID");
  }
  if (key === "floatingLauncherExpanded" && typeof value !== "boolean") throw new Error("STORAGE_VALUE_INVALID");
  if (key === "platformState") {
    if (!value || typeof value !== "object" || Array.isArray(value) || JSON.stringify(value).length > 65_536) throw new Error("STORAGE_VALUE_INVALID");
    const allowed = ["users", "memberships", "workspaces", "applications", "lineIntegrations", "loginChannels", "messagingChannels", "credentialReferences", "channelBindings", "featureEntitlements", "verificationResults", "auditEvents", "session", "currentWorkspaceRef", "currentBindingRef"];
    if (Object.keys(value).some((entry) => !allowed.includes(entry))) throw new Error("STORAGE_VALUE_INVALID");
    for (const collection of ["users", "memberships", "workspaces", "applications", "lineIntegrations", "loginChannels", "messagingChannels", "credentialReferences", "channelBindings", "featureEntitlements", "verificationResults", "auditEvents"]) {
      if (value[collection] !== undefined && (!Array.isArray(value[collection]) || value[collection].length > 40)) throw new Error("STORAGE_VALUE_INVALID");
    }
  }
  if (key === "floatingLauncherHiddenHosts") {
    if (!Array.isArray(value) || value.length > FLOATING_LAUNCHER_HOSTS.length) throw new Error("STORAGE_VALUE_INVALID");
    if (new Set(value).size !== value.length || value.some((host) => !FLOATING_LAUNCHER_HOSTS.includes(host))) {
      throw new Error("STORAGE_VALUE_INVALID");
    }
  }
}

export function validateStorageEntries(entries) {
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) throw new Error("STORAGE_VALUE_INVALID");
  for (const [key, value] of Object.entries(entries)) {
    if (!ALLOWED_STORAGE_KEYS.includes(key)) throw new Error("STORAGE_KEY_NOT_ALLOWED");
    assertNoSensitiveFields(value);
    validateKnownValue(key, value);
  }
  return true;
}

export async function setSafeStorage(entries, storageArea = chrome.storage.local) {
  validateStorageEntries(entries);
  await storageArea.set(entries);
}

export async function getSafeStorage(keys, storageArea = chrome.storage.local) {
  const requested = Array.isArray(keys) ? keys : [keys];
  if (requested.some((key) => !ALLOWED_STORAGE_KEYS.includes(key))) throw new Error("STORAGE_KEY_NOT_ALLOWED");
  const result = await storageArea.get(requested);
  validateStorageEntries(result);
  return result;
}
