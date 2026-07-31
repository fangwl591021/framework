import type { PlatformCoreApplication } from "../application/core-services";
import {
  moduleDashboardManifests,
  moduleNavigationManifests,
} from "./manifests";
import type {
  ApplicationDashboard,
  ApplicationNavigation,
  TrustedModuleContext,
} from "./models";
import { ModuleAccessError } from "./models";
import type {
  AssemblyObservationPort,
  ModuleTrafficAdmissionPort,
} from "./ports";
import { ApplicationAssemblyRepository } from "./repository";

export class ModuleAccessGuard {
  constructor(
    private readonly repository: ApplicationAssemblyRepository,
    private readonly core: PlatformCoreApplication,
    private readonly traffic: ModuleTrafficAdmissionPort,
    private readonly observations: AssemblyObservationPort,
    private readonly now: () => number,
  ) {}
  async assertAccess(context: TrustedModuleContext): Promise<void> {
    if (context.source !== "trusted_runtime_context")
      return this.deny(context, "APPLICATION_NOT_FOUND");
    const application = await this.repository.getApplication(
      context.tenantId,
      context.applicationId,
    );
    if (!application) return this.deny(context, "APPLICATION_NOT_FOUND");
    if (application.status !== "active")
      return this.deny(context, "APPLICATION_NOT_ACTIVE");
    const module = await this.repository.getModule(context.moduleKey);
    if (!module) return this.deny(context, "MODULE_NOT_REGISTERED");
    if (module.availabilityStatus !== "available")
      return this.deny(context, "MODULE_NOT_AVAILABLE");
    const entitlement = await this.repository.getEntitlement(
      context.tenantId,
      context.applicationId,
      context.moduleKey,
    );
    if (
      !entitlement ||
      entitlement.status === "revoked" ||
      entitlement.status === "expired"
    )
      return this.deny(context, "MODULE_NOT_ENTITLED");
    const now = this.now();
    if (
      entitlement.validFrom > now ||
      (entitlement.validUntil !== null && entitlement.validUntil <= now)
    )
      return this.deny(context, "MODULE_ENTITLEMENT_EXPIRED");
    const enabled = await this.repository.getEnablement(
      context.tenantId,
      context.applicationId,
      context.moduleKey,
    );
    if (enabled?.status !== "enabled")
      return this.deny(context, "MODULE_NOT_ENABLED");
    const deps = await this.repository.listDependencyStates(
      context.tenantId,
      context.applicationId,
      context.moduleKey,
    );
    for (const d of deps) {
      const valid =
        d.entitlement_status !== null &&
        d.valid_from !== null &&
        d.valid_from <= now &&
        (d.valid_until === null || d.valid_until > now) &&
        d.enablement_status === "enabled" &&
        d.availability_status === "available";
      if (d.dependency_type === "required" && !valid)
        return this.deny(context, "MODULE_DEPENDENCY_MISSING");
      if (d.dependency_type === "conflict" && valid)
        return this.deny(context, "MODULE_CONFLICT");
    }
    if (
      !(await this.core.checkPermission(
        context.tenantId,
        context.actorMembershipId,
        context.requiredPermission,
      ))
    )
      return this.deny(context, "PERMISSION_DENIED");
    if (!(await this.traffic.admit(context)))
      return this.deny(context, "TRAFFIC_NOT_ADMITTED");
  }
  async buildNavigation(
    tenantId: string,
    applicationId: string,
    membershipId: string,
  ): Promise<ApplicationNavigation> {
    const [modules, permissionKeys] = await Promise.all([
      this.repository.listVisibleModules(tenantId, applicationId, this.now()),
      this.repository.listMembershipPermissionKeys(tenantId, membershipId),
    ]);
    const permissions = new Set(permissionKeys);
    const items = modules
      .flatMap((module) => moduleNavigationManifests[module.moduleKey] ?? [])
      .filter((item) => permissions.has(item.requiredPermission));
    return {
      applicationId,
      items: items.sort(
        (a, b) =>
          a.order - b.order || a.navigationKey.localeCompare(b.navigationKey),
      ),
    };
  }
  async buildDashboard(
    tenantId: string,
    applicationId: string,
    membershipId: string,
  ): Promise<ApplicationDashboard> {
    const [modules, permissionKeys] = await Promise.all([
      this.repository.listVisibleModules(tenantId, applicationId, this.now()),
      this.repository.listMembershipPermissionKeys(tenantId, membershipId),
    ]);
    const permissions = new Set(permissionKeys);
    const cards = modules
      .flatMap((module) => moduleDashboardManifests[module.moduleKey] ?? [])
      .filter((card) => permissions.has(card.requiredPermission));
    return {
      applicationId,
      cards: cards.sort(
        (a, b) => a.order - b.order || a.cardKey.localeCompare(b.cardKey),
      ),
    };
  }
  private async deny(
    context: TrustedModuleContext,
    code: ConstructorParameters<typeof ModuleAccessError>[0],
  ): Promise<never> {
    try {
      await this.observations.record({
        eventType: "module.access_denied",
        tenantId: context.tenantId,
        applicationId: context.applicationId,
        moduleKey: context.moduleKey,
        reasonCode: code,
      });
    } catch {}
    throw new ModuleAccessError(code);
  }
}

export class GatedModuleInvoker {
  constructor(private readonly guard: ModuleAccessGuard) {}
  async invoke<T>(
    context: TrustedModuleContext,
    domainOperation: () => Promise<T>,
  ): Promise<T> {
    await this.guard.assertAccess(context);
    return domainOperation();
  }
}
