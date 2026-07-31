export type ApplicationStatus = "active" | "suspended" | "archived";
export type EntitlementStatus =
  | "included"
  | "purchased"
  | "trial"
  | "expired"
  | "revoked";
export type EnablementStatus = "enabled" | "disabled";
export type ModuleAvailability = "available" | "unavailable" | "retired";
export type DependencyType = "required" | "optional" | "conflict";

export interface TenantApplication {
  readonly id: string;
  readonly tenantId: string;
  readonly applicationKey: string;
  readonly name: string;
  readonly status: ApplicationStatus;
  readonly defaultLocale: string;
  readonly configurationReference: string | null;
  readonly version: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface CatalogModule {
  readonly moduleKey: string;
  readonly displayName: string;
  readonly version: string;
  readonly category: "domain" | "extension";
  readonly lifecycleStatus: "candidate" | "stable" | "deprecated";
  readonly availabilityStatus: ModuleAvailability;
  readonly contractVersion: string;
  readonly configurationSchemaVersion: string;
  readonly navigationManifestVersion: string;
}

export interface ModuleEntitlement {
  readonly id: string;
  readonly tenantId: string;
  readonly applicationId: string;
  readonly moduleKey: string;
  readonly status: EntitlementStatus;
  readonly validFrom: number;
  readonly validUntil: number | null;
  readonly version: number;
}

export interface ModuleEnablement {
  readonly id: string;
  readonly tenantId: string;
  readonly applicationId: string;
  readonly moduleKey: string;
  readonly status: EnablementStatus;
  readonly version: number;
}

export interface TrustedModuleContext {
  readonly source: "trusted_runtime_context";
  readonly tenantId: string;
  readonly applicationId: string;
  readonly moduleKey: string;
  readonly actorMembershipId: string;
  readonly requiredPermission: string;
  readonly operation: string;
  readonly correlationId: string;
}

export interface ModuleAccessSnapshot {
  readonly tenantId: string;
  readonly applicationId: string;
  readonly moduleKey: string;
  readonly actorMembershipId: string;
  readonly requiredPermission: string;
  readonly applicationVersion: number;
  readonly entitlementId: string;
  readonly entitlementVersion: number;
  readonly enablementVersion: number;
  readonly evaluatedAt: number;
  readonly accessFence: string;
}

export type ModuleAccessCode =
  | "APPLICATION_NOT_FOUND"
  | "APPLICATION_NOT_ACTIVE"
  | "MODULE_NOT_REGISTERED"
  | "MODULE_NOT_AVAILABLE"
  | "MODULE_NOT_ENTITLED"
  | "MODULE_ENTITLEMENT_EXPIRED"
  | "MODULE_NOT_ENABLED"
  | "MODULE_DEPENDENCY_MISSING"
  | "MODULE_CONFLICT"
  | "PERMISSION_DENIED"
  | "TRAFFIC_NOT_ADMITTED"
  | "STALE_MODULE_ACCESS";

export class ModuleAccessError extends Error {
  constructor(readonly code: ModuleAccessCode) {
    super(code);
    this.name = "ModuleAccessError";
  }
}

export interface NavigationItem {
  readonly navigationKey: string;
  readonly label: string;
  readonly route: string;
  readonly order: number;
  readonly requiredPermission: string;
  readonly requiredFeature: string;
  readonly iconKey: string;
  readonly visibility: "module_enabled";
}
export interface DashboardCard {
  readonly cardKey: string;
  readonly title: string;
  readonly destination: string;
  readonly requiredPermission: string;
  readonly summaryQueryKey: string;
  readonly order: number;
}
export interface ApplicationNavigation {
  readonly applicationId: string;
  readonly items: readonly NavigationItem[];
}
export interface ApplicationDashboard {
  readonly applicationId: string;
  readonly cards: readonly DashboardCard[];
}

export const applicationAssemblyPermissions = {
  applicationRead: "application:read",
  applicationManage: "application:manage",
  catalogRead: "module_catalog:read",
  catalogManage: "module_catalog:manage",
  entitlementRead: "module_entitlement:read",
  entitlementManage: "module_entitlement:manage",
  enablementRead: "module_enablement:read",
  enablementManage: "module_enablement:manage",
  configurationRead: "module_configuration:read",
  configurationManage: "module_configuration:manage",
} as const;
