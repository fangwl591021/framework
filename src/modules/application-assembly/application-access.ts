import {
  ApplicationAssemblyError,
  type ApplicationDashboard,
  type ApplicationDashboardModule,
  type ApplicationNavigationItem,
  type ModuleAccessDecision,
  type ModuleCatalogRecord,
} from "./models";
import {
  MAX_NAVIGATION_ITEMS,
  TRUSTED_APPLICATION_CONTEXT,
  nowMs,
} from "./application-base";
import type { ModuleDependencyRecord } from "./repository";
import { ApplicationEntitlementApplication } from "./application-entitlement";

const TRUSTED_SERVER_APPLICATION_BINDING = Symbol(
  "trusted-server-application-binding",
);

export interface ServerApplicationBinding {
  readonly applicationId: string;
  readonly trustMarker: symbol;
}

export function createServerApplicationBinding(
  applicationId: string,
): ServerApplicationBinding {
  return Object.freeze({
    applicationId,
    trustMarker: TRUSTED_SERVER_APPLICATION_BINDING,
  });
}

export interface TrustedApplicationContext {
  readonly tenantId: string;
  readonly applicationId: string;
  readonly trustMarker: symbol;
}

export class ApplicationAccessApplication extends ApplicationEntitlementApplication {
  async validateModuleDependencies(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    moduleKey: string,
  ): Promise<readonly ModuleDependencyRecord[]> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const snapshot = await this.requireOperationalSnapshot(
      tenantId,
      applicationId,
      moduleKey,
      false,
    );
    if (!snapshot.dependenciesSatisfied) {
      throw new ApplicationAssemblyError("MODULE_DEPENDENCY_UNSATISFIED");
    }
    return this.applicationRepository.listDependencies(
      tenantId,
      snapshot.module.id,
    );
  }

  async resolveTrustedApplicationContext(
    tenantId: string,
    binding: ServerApplicationBinding,
  ): Promise<TrustedApplicationContext> {
    if (binding.trustMarker !== TRUSTED_SERVER_APPLICATION_BINDING) {
      throw new ApplicationAssemblyError("UNTRUSTED_APPLICATION_CONTEXT");
    }
    await this.requireApplication(tenantId, binding.applicationId);
    return Object.freeze({
      tenantId,
      applicationId: binding.applicationId,
      trustMarker: TRUSTED_APPLICATION_CONTEXT,
    });
  }

  private assertTrustedContext(context: TrustedApplicationContext): void {
    if (context.trustMarker !== TRUSTED_APPLICATION_CONTEXT) {
      throw new ApplicationAssemblyError("UNTRUSTED_APPLICATION_CONTEXT");
    }
  }

  async checkModuleAccess(
    applicationContext: TrustedApplicationContext,
    actorMembershipId: string,
    moduleKey: string,
  ): Promise<ModuleAccessDecision> {
    this.assertTrustedContext(applicationContext);
    const timestamp = nowMs(this.clock);
    const snapshot = await this.applicationRepository.getAccessSnapshot(
      applicationContext.tenantId,
      applicationContext.applicationId,
      moduleKey,
      timestamp,
    );
    if (!snapshot) {
      throw new ApplicationAssemblyError("APPLICATION_SCOPE_DENIED");
    }
    const structural = this.evaluateSnapshot(snapshot, timestamp);
    if (!structural.allowed) return structural;
    const permitted = await this.checkPermission(
      applicationContext.tenantId,
      actorMembershipId,
      snapshot.module.accessPermissionKey,
    );
    return permitted
      ? structural
      : {
          ...structural,
          allowed: false,
          reason: "MODULE_PERMISSION_DENIED",
        };
  }

  async requireModuleAccess(
    applicationContext: TrustedApplicationContext,
    actorMembershipId: string,
    moduleKey: string,
  ): Promise<void> {
    const decision = await this.checkModuleAccess(
      applicationContext,
      actorMembershipId,
      moduleKey,
    );
    if (decision.allowed) return;
    const code = decision.reason === "APPLICATION_NOT_ACTIVE"
      ? "APPLICATION_INVALID_STATE"
      : decision.reason;
    if (code === "ALLOWED") return;
    throw new ApplicationAssemblyError(code);
  }

  async canRunModuleBackgroundWork(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
  ): Promise<boolean> {
    const timestamp = nowMs(this.clock);
    const snapshot = await this.applicationRepository.getAccessSnapshot(
      tenantId,
      applicationId,
      moduleKey,
      timestamp,
    );
    return snapshot ? this.evaluateSnapshot(snapshot, timestamp).allowed : false;
  }

  private async visibleModules(
    tenantId: string,
    applicationId: string,
    actorMembershipId: string,
  ): Promise<readonly ModuleCatalogRecord[]> {
    const timestamp = nowMs(this.clock);
    const [modules, permissions] = await Promise.all([
      this.applicationRepository.listOperationalModules(
        tenantId,
        applicationId,
        timestamp,
        100,
      ),
      this.getEffectivePermissions(tenantId, actorMembershipId),
    ]);
    const permissionSet = new Set(permissions);
    return modules.filter((module) =>
      permissionSet.has(module.accessPermissionKey)
    );
  }

  async buildApplicationNavigation(
    applicationContext: TrustedApplicationContext,
    actorMembershipId: string,
  ): Promise<readonly ApplicationNavigationItem[]> {
    this.assertTrustedContext(applicationContext);
    const modules = await this.visibleModules(
      applicationContext.tenantId,
      applicationContext.applicationId,
      actorMembershipId,
    );
    return modules.flatMap((module) =>
      module.navigationManifest.items.map((item) => ({
        ...item,
        moduleKey: module.moduleKey,
      }))
    ).slice(0, MAX_NAVIGATION_ITEMS);
  }

  async getApplicationDashboard(
    applicationContext: TrustedApplicationContext,
    actorMembershipId: string,
  ): Promise<ApplicationDashboard> {
    this.assertTrustedContext(applicationContext);
    const [application, modules] = await Promise.all([
      this.requireApplication(
        applicationContext.tenantId,
        applicationContext.applicationId,
      ),
      this.visibleModules(
        applicationContext.tenantId,
        applicationContext.applicationId,
        actorMembershipId,
      ),
    ]);
    const dashboardModules: ApplicationDashboardModule[] = modules.map(
      (module) => ({
        moduleKey: module.moduleKey,
        displayName: module.displayName,
        navigation: module.navigationManifest.items.map((item) => ({
          ...item,
          moduleKey: module.moduleKey,
        })),
      }),
    );
    return { application, modules: dashboardModules };
  }

}
