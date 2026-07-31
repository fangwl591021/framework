export type ApplicationStatus = "active" | "suspended";
export type ModuleLifecycleStatus =
  | "candidate"
  | "experimental"
  | "stable"
  | "core_approved"
  | "deprecated"
  | "retired";
export type ModuleAvailabilityStatus = "available" | "unavailable";
export type ModuleEntitlementStatus =
  | "included"
  | "purchased"
  | "trial"
  | "expired"
  | "revoked";
export type ModuleEnablementStatus = "enabled" | "disabled";

export interface ApplicationRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly applicationKey: string;
  readonly name: string;
  readonly status: ApplicationStatus;
  readonly version: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly suspendedAt: number | null;
}

export interface NavigationManifestItem {
  readonly itemKey: string;
  readonly label: string;
  readonly path: string;
}

export interface ModuleNavigationManifest {
  readonly items: readonly NavigationManifestItem[];
}

export interface ModuleDependencyInput {
  readonly moduleKey: string;
}

export interface RegisterModuleInput {
  readonly moduleKey: string;
  readonly displayName: string;
  readonly moduleVersion: string;
  readonly lifecycleStatus: ModuleLifecycleStatus;
  readonly availabilityStatus: ModuleAvailabilityStatus;
  readonly accessPermissionKey: string;
  readonly navigationManifest: ModuleNavigationManifest;
  readonly dependencies?: readonly ModuleDependencyInput[];
}

export interface ModuleCatalogRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly moduleKey: string;
  readonly displayName: string;
  readonly moduleVersion: string;
  readonly lifecycleStatus: ModuleLifecycleStatus;
  readonly availabilityStatus: ModuleAvailabilityStatus;
  readonly accessPermissionKey: string;
  readonly navigationManifest: ModuleNavigationManifest;
  readonly version: number;
}

export interface ApplicationModuleRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly applicationId: string;
  readonly moduleCatalogId: string;
  readonly entitlementStatus: ModuleEntitlementStatus;
  readonly entitlementExpiresAt: number | null;
  readonly enablementStatus: ModuleEnablementStatus;
  readonly version: number;
}

export interface ApplicationConfigurationRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly applicationId: string;
  readonly configurationKey: string;
  readonly valueType: "boolean" | "number" | "string" | "json";
  readonly value: unknown;
  readonly status: "active" | "archived";
  readonly version: number;
}

export type ModuleAccessReason =
  | "ALLOWED"
  | "APPLICATION_NOT_ACTIVE"
  | "MODULE_NOT_AVAILABLE"
  | "MODULE_NOT_ENTITLED"
  | "MODULE_NOT_ENABLED"
  | "MODULE_DEPENDENCY_UNSATISFIED"
  | "MODULE_PERMISSION_DENIED";

export interface ModuleAccessDecision {
  readonly allowed: boolean;
  readonly reason: ModuleAccessReason;
  readonly applicationId: string;
  readonly moduleKey: string;
}

export interface ApplicationNavigationItem extends NavigationManifestItem {
  readonly moduleKey: string;
}

export interface ApplicationDashboardModule {
  readonly moduleKey: string;
  readonly displayName: string;
  readonly navigation: readonly ApplicationNavigationItem[];
}

export interface ApplicationDashboard {
  readonly application: ApplicationRecord;
  readonly modules: readonly ApplicationDashboardModule[];
}

export type ApplicationAssemblyErrorCode =
  | "APPLICATION_SCOPE_DENIED"
  | "APPLICATION_INVALID_STATE"
  | "MODULE_SCOPE_DENIED"
  | "MODULE_INVALID_STATE"
  | "MODULE_NOT_AVAILABLE"
  | "MODULE_NOT_ENTITLED"
  | "MODULE_NOT_ENABLED"
  | "MODULE_DEPENDENCY_UNSATISFIED"
  | "MODULE_PERMISSION_DENIED"
  | "UNTRUSTED_APPLICATION_CONTEXT"
  | "CONFIGURATION_SECRET_FORBIDDEN";

export class ApplicationAssemblyError extends Error {
  constructor(readonly code: ApplicationAssemblyErrorCode) {
    super(code);
    this.name = "ApplicationAssemblyError";
  }
}
