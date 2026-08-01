import { isAllowedAdminRoute } from "./admin-navigation.js";
import { getSafeStorage, setSafeStorage } from "./storage.js";

export const FULL_PAGE_DASHBOARD_PATH = "dashboard/index.html";

export async function openFullPageDashboard(routeId = "overview", dependencies = {}) {
  if (!isAllowedAdminRoute(routeId)) throw new Error("DASHBOARD_ROUTE_NOT_ALLOWED");
  const runtime = dependencies.runtime ?? chrome.runtime;
  const tabs = dependencies.tabs ?? chrome.tabs;
  const getState = dependencies.getState ?? getSafeStorage;
  const setState = dependencies.setState ?? setSafeStorage;
  const stored = await getState(["uiPreferences"]);
  const uiPreferences = stored.uiPreferences && typeof stored.uiPreferences === "object" ? stored.uiPreferences : {};
  await setState({ uiPreferences: { ...uiPreferences, selectedAdminRoute: routeId } });
  const dashboardUrl = runtime.getURL(FULL_PAGE_DASHBOARD_PATH);
  const matches = await tabs.query({});
  const existing = matches.find((tab) => Number.isInteger(tab.id) && tab.url === dashboardUrl);
  if (existing) return tabs.update(existing.id, { active: true });
  return tabs.create({ url: dashboardUrl });
}