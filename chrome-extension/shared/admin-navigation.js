export const ADMIN_NAVIGATION = Object.freeze([
  Object.freeze({ id: "operations", label: "營運中心", routes: Object.freeze([
    Object.freeze({ id: "overview", label: "總覽", icon: "◫", availability: "active" }),
    Object.freeze({ id: "accounts", label: "官方帳號", icon: "◎", availability: "active" }),
    Object.freeze({ id: "messages", label: "訊息中心", icon: "▤", availability: "active" }),
  ]) }),
  Object.freeze({ id: "automation", label: "自動化", routes: Object.freeze([
    Object.freeze({ id: "keyword-rules", label: "關鍵字規則", icon: "⌁", availability: "not_entitled" }),
    Object.freeze({ id: "default-reply", label: "預設回覆", icon: "↩", availability: "not_entitled" }),
    Object.freeze({ id: "auto-reply", label: "自動回覆", icon: "↻", availability: "not_entitled" }),
  ]) }),
  Object.freeze({ id: "content", label: "內容工具", routes: Object.freeze([
    Object.freeze({ id: "rich-menu", label: "圖文選單", icon: "▦", availability: "not_entitled" }),
    Object.freeze({ id: "bot-cards", label: "機器人與專區卡片", icon: "◇", availability: "not_entitled" }),
    Object.freeze({ id: "url-fetcher", label: "網址擷取器", icon: "↗", availability: "not_entitled" }),
  ]) }),
  Object.freeze({ id: "platform", label: "平台管理", routes: Object.freeze([
    Object.freeze({ id: "line-integration", label: "LINE OA 串接", icon: "⌁", availability: "authenticated" }),
    Object.freeze({ id: "applications", label: "應用管理", icon: "▣", availability: "authenticated" }),
    Object.freeze({ id: "team-permissions", label: "團隊與權限", icon: "♙", availability: "authenticated" }),
    Object.freeze({ id: "usage", label: "使用量", icon: "▥", availability: "authenticated" }),
    Object.freeze({ id: "audit", label: "操作紀錄", icon: "≡", availability: "authenticated" }),
  ]) }),
  Object.freeze({ id: "account", label: "帳戶", routes: Object.freeze([
    Object.freeze({ id: "profile", label: "個人資料", icon: "○", availability: "authenticated" }),
    Object.freeze({ id: "settings", label: "系統設定", icon: "⚙", availability: "authenticated" }),
    Object.freeze({ id: "logout", label: "登出", icon: "⇥", availability: "authenticated" }),
  ]) }),
]);
export const ADMIN_ROUTE_IDS = Object.freeze(ADMIN_NAVIGATION.flatMap((group) => group.routes.map((route) => route.id)));
export const ADMIN_GROUP_IDS = Object.freeze(ADMIN_NAVIGATION.map((group) => group.id));
export function normalizeAdminPreferences(value) { const source = value && typeof value === "object" && !Array.isArray(value) ? value : {}; const collapsed = Array.isArray(source.collapsedAdminGroups) ? source.collapsedAdminGroups.filter((id) => ADMIN_GROUP_IDS.includes(id)) : []; return Object.freeze({ collapsedAdminGroups: Object.freeze([...new Set(collapsed)]), adminSidebarCompact: source.adminSidebarCompact === true }); }
export function toggleCollapsedGroup(current, groupId) { const normalized = normalizeAdminPreferences(current); if (!ADMIN_GROUP_IDS.includes(groupId)) return normalized; const next = new Set(normalized.collapsedAdminGroups); next.has(groupId) ? next.delete(groupId) : next.add(groupId); return Object.freeze({ ...normalized, collapsedAdminGroups: Object.freeze([...next].sort()) }); }
export function resolveAdminRoute(routeId) { const route = ADMIN_ROUTE_IDS.includes(routeId) ? routeId : "overview"; const group = ADMIN_NAVIGATION.find((entry) => entry.routes.some((item) => item.id === route)); const item = group.routes.find((entry) => entry.id === route); return Object.freeze({ route, groupId: group.id, groupLabel: group.label, label: item.label, availability: item.availability }); }
export function isAllowedAdminRoute(routeId) { return ADMIN_ROUTE_IDS.includes(routeId); }
