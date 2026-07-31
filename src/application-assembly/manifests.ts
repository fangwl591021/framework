import type { DashboardCard, NavigationItem } from "./models";

export const moduleNavigationManifests: Readonly<
  Record<string, readonly NavigationItem[]>
> = Object.freeze({
  event_engine: [
    {
      navigationKey: "event.manage",
      label: "活動管理",
      route: "/events",
      order: 10,
      requiredPermission: "tenant:update",
      requiredFeature: "event.manage",
      iconKey: "calendar",
      visibility: "module_enabled",
    },
    {
      navigationKey: "event.roster",
      label: "報名名單",
      route: "/events/registrations",
      order: 20,
      requiredPermission: "membership:read",
      requiredFeature: "event.roster",
      iconKey: "users",
      visibility: "module_enabled",
    },
    {
      navigationKey: "event.checkin",
      label: "核銷管理",
      route: "/events/checkins",
      order: 30,
      requiredPermission: "membership:manage",
      requiredFeature: "event.checkin",
      iconKey: "scan",
      visibility: "module_enabled",
    },
    {
      navigationKey: "event.statistics",
      label: "活動統計",
      route: "/events/statistics",
      order: 40,
      requiredPermission: "tenant:read",
      requiredFeature: "event.statistics",
      iconKey: "chart",
      visibility: "module_enabled",
    },
  ],
  business_network_engine: [
    {
      navigationKey: "network.overview",
      label: "商業網路",
      route: "/network",
      order: 100,
      requiredPermission: "network:read",
      requiredFeature: "network.overview",
      iconKey: "network",
      visibility: "module_enabled",
    },
    {
      navigationKey: "network.partners",
      label: "夥伴管理",
      route: "/network/partners",
      order: 110,
      requiredPermission: "network:manage",
      requiredFeature: "network.partners",
      iconKey: "users",
      visibility: "module_enabled",
    },
    {
      navigationKey: "network.referrals",
      label: "推薦歸屬",
      route: "/network/referrals",
      order: 120,
      requiredPermission: "referral:read",
      requiredFeature: "network.referrals",
      iconKey: "share",
      visibility: "module_enabled",
    },
    {
      navigationKey: "network.sales",
      label: "銷售管理",
      route: "/network/sales",
      order: 130,
      requiredPermission: "sales:read",
      requiredFeature: "network.sales",
      iconKey: "receipt",
      visibility: "module_enabled",
    },
    {
      navigationKey: "network.commissions",
      label: "佣金管理",
      route: "/network/commissions",
      order: 140,
      requiredPermission: "commission:read_all",
      requiredFeature: "network.commissions",
      iconKey: "wallet",
      visibility: "module_enabled",
    },
  ],
});

export const moduleDashboardManifests: Readonly<
  Record<string, readonly DashboardCard[]>
> = Object.freeze({
  event_engine: [
    {
      cardKey: "event.summary",
      title: "活動概況",
      destination: "/events/statistics",
      requiredPermission: "tenant:read",
      summaryQueryKey: "event.summary",
      order: 10,
    },
  ],
  business_network_engine: [
    {
      cardKey: "network.summary",
      title: "商業網路概況",
      destination: "/network",
      requiredPermission: "network:read",
      summaryQueryKey: "network.summary",
      order: 20,
    },
  ],
});

export function assertUniqueManifestKeys(): void {
  const nav = Object.values(moduleNavigationManifests)
    .flat()
    .map((x) => x.navigationKey);
  const cards = Object.values(moduleDashboardManifests)
    .flat()
    .map((x) => x.cardKey);
  if (new Set(nav).size !== nav.length || new Set(cards).size !== cards.length)
    throw new Error("DUPLICATE_MANIFEST_KEY");
}
