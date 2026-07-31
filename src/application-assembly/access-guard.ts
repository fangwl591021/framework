import type { PlatformCoreApplication } from "../application/core-services";
import {
  moduleDashboardManifests,
  moduleNavigationManifests,
} from "./manifests";
import type {
  ApplicationDashboard,
  ApplicationNavigation,
  ModuleAccessSnapshot,
  TrustedModuleContext,
} from "./models";
import { ModuleAccessError } from "./models";
import type {
  AssemblyObservationPort,
  ModuleEligibilityPort,
  ModuleTrafficAdmissionPort,
  TrafficAdmissionLease,
} from "./ports";
import { ApplicationAssemblyRepository } from "./repository";

/** Side-effect-free capability projection for shell/navigation and access snapshots. */
export class ModuleEligibilityEvaluator implements ModuleEligibilityPort {
  constructor(
    private readonly repository: ApplicationAssemblyRepository,
    private readonly core: PlatformCoreApplication,
    private readonly observations: AssemblyObservationPort,
    private readonly now: () => number,
  ) {}

  async requireEligible(
    context: TrustedModuleContext,
  ): Promise<ModuleAccessSnapshot> {
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
    const evaluatedAt = this.now();
    if (
      entitlement.validFrom > evaluatedAt ||
      (entitlement.validUntil !== null && entitlement.validUntil <= evaluatedAt)
    )
      return this.deny(context, "MODULE_ENTITLEMENT_EXPIRED");
    const enablement = await this.repository.getEnablement(
      context.tenantId,
      context.applicationId,
      context.moduleKey,
    );
    if (enablement?.status !== "enabled")
      return this.deny(context, "MODULE_NOT_ENABLED");
    if (!(await this.dependenciesSatisfied(context, evaluatedAt)))
      return this.deny(context, "MODULE_DEPENDENCY_MISSING");
    if (
      !(await this.core.checkPermission(
        context.tenantId,
        context.actorMembershipId,
        context.requiredPermission,
      ))
    )
      return this.deny(context, "PERMISSION_DENIED");
    return Object.freeze({
      tenantId: context.tenantId,
      applicationId: context.applicationId,
      moduleKey: context.moduleKey,
      actorMembershipId: context.actorMembershipId,
      requiredPermission: context.requiredPermission,
      applicationVersion: application.version,
      entitlementId: entitlement.id,
      entitlementVersion: entitlement.version,
      enablementVersion: enablement.version,
      evaluatedAt,
      accessFence: `${application.id}:${application.version}:${entitlement.id}:${entitlement.version}:${enablement.id}:${enablement.version}`,
    });
  }

  async assertAccess(context: TrustedModuleContext): Promise<void> {
    await this.requireEligible(context);
  }

  async isSnapshotCurrent(snapshot: ModuleAccessSnapshot): Promise<boolean> {
    const [application, entitlement, enablement, permission] =
      await Promise.all([
        this.repository.getApplication(
          snapshot.tenantId,
          snapshot.applicationId,
        ),
        this.repository.getEntitlement(
          snapshot.tenantId,
          snapshot.applicationId,
          snapshot.moduleKey,
        ),
        this.repository.getEnablement(
          snapshot.tenantId,
          snapshot.applicationId,
          snapshot.moduleKey,
        ),
        this.core.checkPermission(
          snapshot.tenantId,
          snapshot.actorMembershipId,
          snapshot.requiredPermission,
        ),
      ]);
    const now = this.now();
    if (
      !application ||
      application.status !== "active" ||
      application.version !== snapshot.applicationVersion
    )
      return false;
    if (
      !entitlement ||
      entitlement.id !== snapshot.entitlementId ||
      entitlement.version !== snapshot.entitlementVersion ||
      !["included", "purchased", "trial"].includes(entitlement.status) ||
      entitlement.validFrom > now ||
      (entitlement.validUntil !== null && entitlement.validUntil <= now)
    )
      return false;
    if (
      !enablement ||
      enablement.status !== "enabled" ||
      enablement.version !== snapshot.enablementVersion
    )
      return false;
    if (!permission) return false;
    const context: TrustedModuleContext = {
      source: "trusted_runtime_context",
      tenantId: snapshot.tenantId,
      applicationId: snapshot.applicationId,
      moduleKey: snapshot.moduleKey,
      actorMembershipId: snapshot.actorMembershipId,
      requiredPermission: snapshot.requiredPermission,
      operation: "access-fence",
      correlationId: "access-fence",
    };
    return this.dependenciesSatisfied(context, now);
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

  private async dependenciesSatisfied(
    context: TrustedModuleContext,
    now: number,
  ): Promise<boolean> {
    const dependencies = await this.repository.listDependencyStates(
      context.tenantId,
      context.applicationId,
      context.moduleKey,
    );
    for (const dependency of dependencies) {
      const active =
        dependency.entitlement_status !== null &&
        dependency.valid_from !== null &&
        dependency.valid_from <= now &&
        (dependency.valid_until === null || dependency.valid_until > now) &&
        dependency.enablement_status === "enabled" &&
        dependency.availability_status === "available";
      if (dependency.dependency_type === "required" && !active) return false;
      if (dependency.dependency_type === "conflict" && active)
        throw new ModuleAccessError("MODULE_CONFLICT");
    }
    return true;
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

/** Traffic stages run once, then eligibility and the current access fence run before domain code. */
export class ModuleInvocationGuard {
  constructor(
    private readonly traffic: ModuleTrafficAdmissionPort,
    private readonly eligibility: ModuleEligibilityPort,
  ) {}

  async invokeMutation<T>(
    context: TrustedModuleContext,
    domainOperation: (snapshot: ModuleAccessSnapshot) => Promise<T>,
  ): Promise<T> {
    this.assertTrusted(context);
    const lease = await this.admitOnce(context);
    try {
      const snapshot = await this.eligibility.requireEligible(context);
      if (!(await this.eligibility.isSnapshotCurrent(snapshot)))
        throw new ModuleAccessError("STALE_MODULE_ACCESS");
      return await domainOperation(snapshot);
    } finally {
      await lease.release();
    }
  }

  async invokeQuery<T>(
    context: TrustedModuleContext,
    domainOperation: (snapshot: ModuleAccessSnapshot) => Promise<T>,
  ): Promise<T> {
    this.assertTrusted(context);
    const lease = await this.admitOnce(context);
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const snapshot = await this.eligibility.requireEligible(context);
        if (await this.eligibility.isSnapshotCurrent(snapshot))
          return await domainOperation(snapshot);
      }
      throw new ModuleAccessError("STALE_MODULE_ACCESS");
    } finally {
      await lease.release();
    }
  }

  private assertTrusted(context: TrustedModuleContext): void {
    if (context.source !== "trusted_runtime_context")
      throw new ModuleAccessError("APPLICATION_NOT_FOUND");
  }

  private async admitOnce(
    context: TrustedModuleContext,
  ): Promise<TrafficAdmissionLease> {
    const admitted = await this.traffic.admit(context);
    let released = false;
    const lease: TrafficAdmissionLease = {
      admitted: admitted.admitted,
      release: async () => {
        if (released) return;
        released = true;
        try {
          await admitted.release();
        } catch {
          // Release evidence/retry belongs to the admission adapter; it cannot
          // overwrite a completed domain result or the formal denial.
        }
      },
    };
    if (!lease.admitted) {
      await lease.release();
      throw new ModuleAccessError("TRAFFIC_NOT_ADMITTED");
    }
    return lease;
  }
}

/** Backward-compatible name for side-effect-free capability checks. */
export class ModuleAccessGuard extends ModuleEligibilityEvaluator {}

export class GatedModuleInvoker {
  constructor(private readonly guard: ModuleInvocationGuard) {}
  invoke<T>(
    context: TrustedModuleContext,
    domainOperation: (snapshot: ModuleAccessSnapshot) => Promise<T>,
  ): Promise<T> {
    return this.guard.invokeMutation(context, domainOperation);
  }
}
