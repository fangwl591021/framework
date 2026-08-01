export const ADMIN_NAVIGATION = Object.freeze([
  Object.freeze({ id: "operations", label: "營運中心", routes: Object.freeze([
    Object.freeze({ id: "overview", label: "總覽", icon: "▦" }),
  ]) }),
  Object.freeze({ id: "tools", label: "營運工具", routes: Object.freeze([
    Object.freeze({ id: "accounts", label: "官方帳號", icon: "◎" }),
    Object.freeze({ id: "messages", label: "訊息中心", icon: "◌" }),
    Object.freeze({ id: "rich-menu", label: "圖文選單", icon: "▤" }),
    Object.freeze({ id: "paid-broadcast", label: "付費推播", icon: "▸" }),
    Object.freeze({ id: "bot-cards", label: "機器人與專區卡片", icon: "◇" }),
    Object.freeze({ id: "url-fetcher", label: "網址擷取器", icon: "↗" }),
  ]) }),
  Object.freeze({ id: "platform", label: "平台管理", routes: Object.freeze([
    Object.freeze({ id: "applications", label: "應用管理", icon: "▧" }),
    Object.freeze({ id: "bindings", label: "Channel Binding", icon: "⌁" }),
    Object.freeze({ id: "webhook", label: "Webhook 狀態", icon: "◉" }),
  ]) }),
  Object.freeze({ id: "system", label: "系統", routes: Object.freeze([
    Object.freeze({ id: "audit", label: "操作紀錄", icon: "≡" }),
    Object.freeze({ id: "settings", label: "系統設定", icon: "⚙" }),
  ]) }),
]);

export const ADMIN_ROUTE_IDS = Object.freeze(ADMIN_NAVIGATION.flatMap((group) => group.routes.map((route) => route.id)));
export const ADMIN_GROUP_IDS = Object.freeze(ADMIN_NAVIGATION.map((group) => group.id));
export const SIDE_PANEL_ROUTE_IDS = Object.freeze(["accounts", "messages", "bindings", "webhook", "settings"]);

export function normalizeAdminPreferences(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const collapsed = Array.isArray(source.collapsedAdminGroups)
    ? source.collapsedAdminGroups.filter((id) => ADMIN_GROUP_IDS.includes(id))
    : [];
  return Object.freeze({
    collapsedAdminGroups: Object.freeze([...new Set(collapsed)]),
    adminSidebarCompact: source.adminSidebarCompact === true,
  });
}

export function toggleCollapsedGroup(current, groupId) {
  const normalized = normalizeAdminPreferences(current);
  if (!ADMIN_GROUP_IDS.includes(groupId)) return normalized;
  const next = new Set(normalized.collapsedAdminGroups);
  next.has(groupId) ? next.delete(groupId) : next.add(groupId);
  return Object.freeze({ ...normalized, collapsedAdminGroups: Object.freeze([...next].sort()) });
}

export function resolveAdminRoute(routeId) {
  const route = ADMIN_ROUTE_IDS.includes(routeId) ? routeId : "overview";
  const group = ADMIN_NAVIGATION.find((entry) => entry.routes.some((entryRoute) => entryRoute.id === route));
  const item = group.routes.find((entryRoute) => entryRoute.id === route);
  return Object.freeze({ route, groupId: group.id, groupLabel: group.label, label: item.label });
}

export function isAllowedAdminRoute(routeId) {
  return ADMIN_ROUTE_IDS.includes(routeId);
}