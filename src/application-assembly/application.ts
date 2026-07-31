import {
  assertSafeText,
  type MutationContext,
} from "../application/core-application-base";
import { PlatformCoreApplication } from "../application/core-services";
import type { Clock } from "../core/clock";
import type { UuidV7 } from "../core/uuidv7";
import type { IdentityDigestKeyProvider } from "../persistence/crypto";
import {
  DomainConflictError,
  TenantBoundaryError,
} from "../persistence/models";
import {
  applicationAssemblyPermissions,
  ModuleAccessError,
  type CatalogModule,
  type DependencyType,
  type EntitlementStatus,
  type TenantApplication,
} from "./models";
import { ApplicationAssemblyRepository } from "./repository";

export interface TenantManager {
  readonly membershipId: string;
}
export interface PlatformOperator {
  readonly authority: "platform_operator";
  readonly permissionKeys: readonly string[];
}
export interface RegisterModuleInput {
  readonly moduleKey: string;
  readonly displayName: string;
  readonly version: string;
  readonly category: "domain" | "extension";
  readonly lifecycleStatus: "candidate" | "stable" | "deprecated";
  readonly contractVersion: string;
  readonly configurationSchemaVersion: string;
  readonly navigationManifestVersion: string;
}
export interface GrantEntitlementInput {
  readonly status: Extract<
    EntitlementStatus,
    "included" | "purchased" | "trial"
  >;
  readonly validFrom: number;
  readonly validUntil?: number | null;
  readonly reasonCode: string;
}

export class ApplicationAssemblyApplication extends PlatformCoreApplication {
  readonly assemblyRepository: ApplicationAssemblyRepository;
  constructor(
    db: D1Database,
    clock: Clock,
    uuidv7: UuidV7,
    identityKeys: IdentityDigestKeyProvider,
  ) {
    super(db, clock, uuidv7, identityKeys);
    this.assemblyRepository = new ApplicationAssemblyRepository(db);
  }
  async createApplication(
    tenantId: string,
    actor: TenantManager,
    input: {
      applicationKey: string;
      name: string;
      defaultLocale: string;
      configurationReference?: string | null;
    },
    context: MutationContext,
  ): Promise<TenantApplication> {
    await this.requireTenantPermission(
      tenantId,
      actor,
      applicationAssemblyPermissions.applicationManage,
    );
    assertSafeText("applicationKey", input.applicationKey, 80);
    assertSafeText("name", input.name, 120);
    assertSafeText("defaultLocale", input.defaultLocale, 20);
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.create",
      input,
      context,
      (t) => ({
        result: {
          id,
          tenantId,
          applicationKey: input.applicationKey,
          name: input.name,
          status: "active",
          defaultLocale: input.defaultLocale,
          configurationReference: input.configurationReference ?? null,
          version: 1,
          createdAt: t,
          updatedAt: t,
        },
        statements: [
          this.db
            .prepare(
              "INSERT INTO applications(id,tenant_id,application_key,name,status,default_locale,configuration_reference,version,created_at,updated_at) VALUES(?1,?2,?3,?4,'active',?5,?6,1,?7,?7)",
            )
            .bind(
              id,
              tenantId,
              input.applicationKey,
              input.name,
              input.defaultLocale,
              input.configurationReference ?? null,
              t,
            ),
        ],
        audit: {
          action: "application.created",
          resourceType: "application",
          resourceReference: id,
          reasonCode: "CREATED",
        },
      }),
    );
  }
  async suspendApplication(
    tenantId: string,
    applicationId: string,
    expectedVersion: number,
    actor: TenantManager,
    context: MutationContext,
  ) {
    await this.requireTenantPermission(
      tenantId,
      actor,
      applicationAssemblyPermissions.applicationManage,
    );
    const current = await this.requireApplication(tenantId, applicationId);
    if (current.status === "archived")
      throw new DomainConflictError("LIFECYCLE_CONFLICT");
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.suspend",
      { applicationId, expectedVersion },
      context,
      (t) => ({
        result: {
          id: applicationId,
          status: "suspended" as const,
          version: expectedVersion + 1,
        },
        statements: [
          this.db
            .prepare(
              "UPDATE applications SET status='suspended',version=version+1,updated_at=?1 WHERE tenant_id=?2 AND id=?3 AND version=?4 AND status='active'",
            )
            .bind(t, tenantId, applicationId, expectedVersion),
        ],
        audit: {
          action: "application.suspended",
          resourceType: "application",
          resourceReference: applicationId,
          reasonCode: "SUSPENDED",
        },
      }),
    );
  }
  async registerModule(
    actor: PlatformOperator,
    input: RegisterModuleInput,
    context: MutationContext,
  ): Promise<CatalogModule> {
    this.requirePlatform(actor, applicationAssemblyPermissions.catalogManage);
    this.validateModuleKey(input.moduleKey);
    const result: CatalogModule = { ...input, availabilityStatus: "available" };
    return this.executeIdempotent(
      { scopeType: "platform", tenantId: null },
      "module.register",
      input,
      context,
      (t) => ({
        result,
        statements: [
          this.db
            .prepare(
              "INSERT INTO module_catalog(module_key,display_name,version,category,lifecycle_status,availability_status,contract_version,configuration_schema_version,navigation_manifest_version,version_number,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,'available',?6,?7,?8,1,?9,?9)",
            )
            .bind(
              input.moduleKey,
              input.displayName,
              input.version,
              input.category,
              input.lifecycleStatus,
              input.contractVersion,
              input.configurationSchemaVersion,
              input.navigationManifestVersion,
              t,
            ),
        ],
        audit: {
          action: "module.registered",
          resourceType: "module_catalog",
          resourceReference: input.moduleKey,
          reasonCode: "REGISTERED",
        },
      }),
    );
  }
  async changeModuleAvailability(
    actor: PlatformOperator,
    moduleKey: string,
    status: "available" | "unavailable" | "retired",
    expectedVersion: number,
    context: MutationContext,
  ) {
    this.requirePlatform(actor, applicationAssemblyPermissions.catalogManage);
    return this.executeIdempotent(
      { scopeType: "platform", tenantId: null },
      "module.availability",
      { moduleKey, status, expectedVersion },
      context,
      (t) => ({
        result: { moduleKey, status, version: expectedVersion + 1 },
        statements: [
          this.db
            .prepare(
              "UPDATE module_catalog SET availability_status=?1,version_number=version_number+1,updated_at=?2 WHERE module_key=?3 AND version_number=?4",
            )
            .bind(status, t, moduleKey, expectedVersion),
        ],
        audit: {
          action: "module.availability_changed",
          resourceType: "module_catalog",
          resourceReference: moduleKey,
          reasonCode: status.toUpperCase(),
        },
      }),
    );
  }
  async addDependency(
    actor: PlatformOperator,
    moduleKey: string,
    dependencyModuleKey: string,
    type: DependencyType,
    minimumVersion: string | null,
    context: MutationContext,
  ) {
    this.requirePlatform(actor, applicationAssemblyPermissions.catalogManage);
    if (
      type === "required" &&
      (await this.assemblyRepository.hasPath(dependencyModuleKey, moduleKey))
    )
      throw new ModuleAccessError("MODULE_CONFLICT");
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "platform", tenantId: null },
      "module.dependency.add",
      { moduleKey, dependencyModuleKey, type, minimumVersion },
      context,
      (t) => ({
        result: { id, moduleKey, dependencyModuleKey, type, minimumVersion },
        statements: [
          this.db
            .prepare(
              "INSERT INTO module_dependencies(id,module_key,dependency_module_key,dependency_type,minimum_version,created_at) VALUES(?1,?2,?3,?4,?5,?6)",
            )
            .bind(id, moduleKey, dependencyModuleKey, type, minimumVersion, t),
        ],
        audit: {
          action: "module.dependency_added",
          resourceType: "module_dependency",
          resourceReference: id,
          reasonCode: type.toUpperCase(),
        },
      }),
    );
  }
  async grantEntitlement(
    actor: PlatformOperator,
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    input: GrantEntitlementInput,
    context: MutationContext,
  ) {
    this.requirePlatform(
      actor,
      applicationAssemblyPermissions.entitlementManage,
    );
    await this.requireApplication(tenantId, applicationId);
    if (!(await this.assemblyRepository.getModule(moduleKey)))
      throw new ModuleAccessError("MODULE_NOT_REGISTERED");
    if (
      input.status === "trial" &&
      (!input.validUntil || input.validUntil <= input.validFrom)
    )
      throw new TypeError("trial validUntil is required");
    const id = this.uuidv7.generate(),
      historyId = this.uuidv7.generate();
    const result = {
      id,
      tenantId,
      applicationId,
      moduleKey,
      status: input.status,
      validFrom: input.validFrom,
      validUntil: input.validUntil ?? null,
      version: 1,
    };
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "module.entitlement.grant",
      { applicationId, moduleKey, input },
      context,
      (t) => ({
        result,
        statements: [
          this.db
            .prepare(
              "INSERT INTO application_module_entitlements(id,tenant_id,application_id,module_key,entitlement_status,valid_from,valid_until,granted_by,reason_code,version,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,1,?10,?10)",
            )
            .bind(
              id,
              tenantId,
              applicationId,
              moduleKey,
              input.status,
              input.validFrom,
              input.validUntil ?? null,
              context.actorReference,
              input.reasonCode,
              t,
            ),
          this.db
            .prepare(
              "INSERT INTO module_entitlement_history(id,tenant_id,application_id,module_key,entitlement_id,from_status,to_status,reason_code,actor_reference,occurred_at) VALUES(?1,?2,?3,?4,?5,NULL,?6,?7,?8,?9)",
            )
            .bind(
              historyId,
              tenantId,
              applicationId,
              moduleKey,
              id,
              input.status,
              input.reasonCode,
              context.actorReference,
              t,
            ),
        ],
        audit: {
          action: "module.entitlement_granted",
          resourceType: "module_entitlement",
          resourceReference: id,
          reasonCode: input.reasonCode,
        },
      }),
    );
  }
  async revokeEntitlement(
    actor: PlatformOperator,
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    expectedVersion: number,
    reasonCode: string,
    context: MutationContext,
  ) {
    this.requirePlatform(
      actor,
      applicationAssemblyPermissions.entitlementManage,
    );
    const current = await this.assemblyRepository.getEntitlement(
      tenantId,
      applicationId,
      moduleKey,
    );
    if (!current) throw new ModuleAccessError("MODULE_NOT_ENTITLED");
    const historyId = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "module.entitlement.revoke",
      { applicationId, moduleKey, expectedVersion, reasonCode },
      context,
      (t) => ({
        result: {
          id: current.id,
          status: "revoked",
          version: expectedVersion + 1,
        },
        statements: [
          this.db
            .prepare(
              "UPDATE application_module_entitlements SET entitlement_status='revoked',reason_code=?1,version=version+1,updated_at=?2 WHERE tenant_id=?3 AND application_id=?4 AND module_key=?5 AND version=?6 AND entitlement_status IN ('included','purchased','trial')",
            )
            .bind(
              reasonCode,
              t,
              tenantId,
              applicationId,
              moduleKey,
              expectedVersion,
            ),
          this.db
            .prepare(
              "INSERT INTO module_entitlement_history(id,tenant_id,application_id,module_key,entitlement_id,from_status,to_status,reason_code,actor_reference,occurred_at) VALUES(?1,?2,?3,?4,?5,?6,'revoked',?7,?8,?9)",
            )
            .bind(
              historyId,
              tenantId,
              applicationId,
              moduleKey,
              current.id,
              current.status,
              reasonCode,
              context.actorReference,
              t,
            ),
        ],
        audit: {
          action: "module.entitlement_revoked",
          resourceType: "module_entitlement",
          resourceReference: current.id,
          reasonCode,
        },
      }),
    );
  }
  async expireTrial(
    actor: PlatformOperator,
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    expectedVersion: number,
    reasonCode: string,
    context: MutationContext,
  ) {
    this.requirePlatform(
      actor,
      applicationAssemblyPermissions.entitlementManage,
    );
    const current = await this.assemblyRepository.getEntitlement(
      tenantId,
      applicationId,
      moduleKey,
    );
    if (!current || current.status !== "trial")
      throw new ModuleAccessError("MODULE_NOT_ENTITLED");
    const historyId = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "module.entitlement.expire",
      { applicationId, moduleKey, expectedVersion, reasonCode },
      context,
      (t) => ({
        result: {
          id: current.id,
          status: "expired" as const,
          version: expectedVersion + 1,
        },
        statements: [
          this.db
            .prepare(
              "UPDATE application_module_entitlements SET entitlement_status='expired',reason_code=?1,version=version+1,updated_at=?2 WHERE tenant_id=?3 AND application_id=?4 AND module_key=?5 AND version=?6 AND entitlement_status='trial'",
            )
            .bind(
              reasonCode,
              t,
              tenantId,
              applicationId,
              moduleKey,
              expectedVersion,
            ),
          this.db
            .prepare(
              "INSERT INTO module_entitlement_history(id,tenant_id,application_id,module_key,entitlement_id,from_status,to_status,reason_code,actor_reference,occurred_at) VALUES(?1,?2,?3,?4,?5,'trial','expired',?6,?7,?8)",
            )
            .bind(
              historyId,
              tenantId,
              applicationId,
              moduleKey,
              current.id,
              reasonCode,
              context.actorReference,
              t,
            ),
        ],
        audit: {
          action: "module.entitlement_expired",
          resourceType: "module_entitlement",
          resourceReference: current.id,
          reasonCode,
        },
      }),
    );
  }
  async enableModule(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    actor: TenantManager,
    context: MutationContext,
  ) {
    await this.requireTenantPermission(
      tenantId,
      actor,
      applicationAssemblyPermissions.enablementManage,
    );
    await this.validateEnablement(tenantId, applicationId, moduleKey);
    const current = await this.assemblyRepository.getEnablement(
      tenantId,
      applicationId,
      moduleKey,
    );
    if (current?.status === "enabled") return current;
    const id = current?.id ?? this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "module.enable",
      { applicationId, moduleKey },
      context,
      (t) => ({
        result: {
          id,
          tenantId,
          applicationId,
          moduleKey,
          status: "enabled" as const,
          version: (current?.version ?? 0) + 1,
        },
        statements: [
          current
            ? this.db
                .prepare(
                  "UPDATE application_module_enablements SET enablement_status='enabled',version=version+1,updated_at=?1 WHERE tenant_id=?2 AND application_id=?3 AND module_key=?4 AND enablement_status='disabled' AND version=?5",
                )
                .bind(t, tenantId, applicationId, moduleKey, current.version)
            : this.db
                .prepare(
                  "INSERT INTO application_module_enablements(id,tenant_id,application_id,module_key,enablement_status,version,created_at,updated_at) VALUES(?1,?2,?3,?4,'enabled',1,?5,?5)",
                )
                .bind(id, tenantId, applicationId, moduleKey, t),
        ],
        audit: {
          action: "module.enabled",
          resourceType: "module_enablement",
          resourceReference: id,
          reasonCode: "ENABLED",
        },
      }),
    );
  }
  async disableModule(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    actor: TenantManager,
    context: MutationContext,
  ) {
    await this.requireTenantPermission(
      tenantId,
      actor,
      applicationAssemblyPermissions.enablementManage,
    );
    const current = await this.assemblyRepository.getEnablement(
      tenantId,
      applicationId,
      moduleKey,
    );
    if (!current || current.status === "disabled") return current;
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "module.disable",
      { applicationId, moduleKey },
      context,
      (t) => ({
        result: {
          ...current,
          status: "disabled" as const,
          version: current.version + 1,
        },
        statements: [
          this.db
            .prepare(
              "UPDATE application_module_enablements SET enablement_status='disabled',version=version+1,updated_at=?1 WHERE tenant_id=?2 AND application_id=?3 AND module_key=?4 AND enablement_status='enabled' AND version=?5",
            )
            .bind(t, tenantId, applicationId, moduleKey, current.version),
        ],
        audit: {
          action: "module.disabled",
          resourceType: "module_enablement",
          resourceReference: current.id,
          reasonCode: "DISABLED",
        },
      }),
    );
  }
  async setApplicationConfiguration(
    tenantId: string,
    applicationId: string,
    configuration: unknown,
    schemaVersion: string,
    expectedVersion: number | null,
    actor: TenantManager,
    context: MutationContext,
  ) {
    await this.requireTenantPermission(
      tenantId,
      actor,
      applicationAssemblyPermissions.configurationManage,
    );
    await this.requireApplication(tenantId, applicationId);
    this.assertSafeConfiguration(configuration);
    const json = JSON.stringify(configuration);
    const existing = await this.db
      .prepare(
        "SELECT id,version FROM application_configuration WHERE tenant_id=?1 AND application_id=?2",
      )
      .bind(tenantId, applicationId)
      .first<{ id: string; version: number }>();
    if ((existing?.version ?? null) !== expectedVersion)
      throw new DomainConflictError("LIFECYCLE_CONFLICT");
    const id = existing?.id ?? this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.configuration.set",
      { applicationId, configuration, schemaVersion, expectedVersion },
      context,
      (t) => ({
        result: { id, version: (expectedVersion ?? 0) + 1 },
        statements: [
          existing
            ? this.db
                .prepare(
                  "UPDATE application_configuration SET schema_version=?1,configuration_json=?2,version=version+1,updated_at=?3 WHERE tenant_id=?4 AND application_id=?5 AND version=?6",
                )
                .bind(
                  schemaVersion,
                  json,
                  t,
                  tenantId,
                  applicationId,
                  expectedVersion,
                )
            : this.db
                .prepare(
                  "INSERT INTO application_configuration(id,tenant_id,application_id,schema_version,configuration_json,version,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,1,?6,?6)",
                )
                .bind(id, tenantId, applicationId, schemaVersion, json, t),
        ],
        audit: {
          action: "application.configuration_changed",
          resourceType: "application_configuration",
          resourceReference: id,
          reasonCode: "CONFIGURATION_UPDATED",
        },
      }),
    );
  }
  async setModuleConfiguration(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    configuration: unknown,
    schemaVersion: string,
    expectedVersion: number | null,
    actor: TenantManager,
    context: MutationContext,
  ) {
    await this.requireTenantPermission(
      tenantId,
      actor,
      applicationAssemblyPermissions.configurationManage,
    );
    this.assertSafeConfiguration(configuration);
    const json = JSON.stringify(configuration);
    const existing = await this.db
      .prepare(
        "SELECT id,version FROM application_module_configuration WHERE tenant_id=?1 AND application_id=?2 AND module_key=?3",
      )
      .bind(tenantId, applicationId, moduleKey)
      .first<{ id: string; version: number }>();
    if ((existing?.version ?? null) !== expectedVersion)
      throw new DomainConflictError("LIFECYCLE_CONFLICT");
    const id = existing?.id ?? this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "module.configuration.set",
      {
        applicationId,
        moduleKey,
        configuration,
        schemaVersion,
        expectedVersion,
      },
      context,
      (t) => ({
        result: { id, version: (expectedVersion ?? 0) + 1 },
        statements: [
          existing
            ? this.db
                .prepare(
                  "UPDATE application_module_configuration SET schema_version=?1,configuration_json=?2,version=version+1,updated_at=?3 WHERE tenant_id=?4 AND application_id=?5 AND module_key=?6 AND version=?7",
                )
                .bind(
                  schemaVersion,
                  json,
                  t,
                  tenantId,
                  applicationId,
                  moduleKey,
                  expectedVersion,
                )
            : this.db
                .prepare(
                  "INSERT INTO application_module_configuration(id,tenant_id,application_id,module_key,schema_version,configuration_json,version,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,1,?7,?7)",
                )
                .bind(
                  id,
                  tenantId,
                  applicationId,
                  moduleKey,
                  schemaVersion,
                  json,
                  t,
                ),
        ],
        audit: {
          action: "module.configuration_changed",
          resourceType: "module_configuration",
          resourceReference: id,
          reasonCode: "CONFIGURATION_UPDATED",
        },
      }),
    );
  }
  private async requireTenantPermission(
    tenantId: string,
    actor: TenantManager,
    permission: string,
  ) {
    const tenant = await this.repositories.tenants.getById(tenantId);
    if (!tenant) throw new TenantBoundaryError();
    if (!(await this.checkPermission(tenantId, actor.membershipId, permission)))
      throw new ModuleAccessError("PERMISSION_DENIED");
  }
  private requirePlatform(actor: PlatformOperator, permission: string) {
    if (
      actor.authority !== "platform_operator" ||
      !actor.permissionKeys.includes(permission)
    )
      throw new ModuleAccessError("PERMISSION_DENIED");
  }
  private async requireApplication(tenantId: string, id: string) {
    const value = await this.assemblyRepository.getApplication(tenantId, id);
    if (!value) throw new ModuleAccessError("APPLICATION_NOT_FOUND");
    return value;
  }
  private async validateEnablement(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
  ) {
    const app = await this.requireApplication(tenantId, applicationId);
    if (app.status !== "active")
      throw new ModuleAccessError("APPLICATION_NOT_ACTIVE");
    const module = await this.assemblyRepository.getModule(moduleKey);
    if (!module) throw new ModuleAccessError("MODULE_NOT_REGISTERED");
    if (module.availabilityStatus !== "available")
      throw new ModuleAccessError("MODULE_NOT_AVAILABLE");
    const e = await this.assemblyRepository.getEntitlement(
        tenantId,
        applicationId,
        moduleKey,
      ),
      now = this.clock.now().getTime();
    if (!e || e.status === "revoked" || e.status === "expired")
      throw new ModuleAccessError("MODULE_NOT_ENTITLED");
    if (e.validFrom > now || (e.validUntil !== null && e.validUntil <= now))
      throw new ModuleAccessError("MODULE_ENTITLEMENT_EXPIRED");
    const deps = await this.assemblyRepository.listDependencyStates(
      tenantId,
      applicationId,
      moduleKey,
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
        throw new ModuleAccessError("MODULE_DEPENDENCY_MISSING");
      if (d.dependency_type === "conflict" && valid)
        throw new ModuleAccessError("MODULE_CONFLICT");
    }
  }
  private validateModuleKey(value: string) {
    if (!/^[a-z][a-z0-9_]{1,79}$/.test(value))
      throw new TypeError("moduleKey is invalid");
  }
  private assertSafeConfiguration(value: unknown) {
    const visit = (v: unknown, depth: number): number => {
      if (depth > 6) throw new TypeError("configuration depth exceeded");
      if (v === null || typeof v === "boolean" || typeof v === "number")
        return 1;
      if (typeof v === "string") {
        if (v.length > 1000)
          throw new TypeError("configuration value too large");
        return 1;
      }
      if (Array.isArray(v)) {
        if (v.length > 50) throw new TypeError("configuration array too large");
        return v.reduce((n, x) => n + visit(x, depth + 1), 1);
      }
      if (typeof v !== "object") throw new TypeError("invalid configuration");
      const entries = Object.entries(v as Record<string, unknown>);
      if (entries.length > 50)
        throw new TypeError("too many configuration keys");
      let count = 1;
      for (const [k, x] of entries) {
        if (
          /secret|token|password|credential/i.test(k) &&
          !/(reference|ref)$/i.test(k)
        )
          throw new TypeError("secret values are forbidden");
        count += visit(x, depth + 1);
        if (count > 200) throw new TypeError("configuration too complex");
      }
      return count;
    };
    visit(value, 0);
    const json = JSON.stringify(value);
    if (!json || json.length > 8192)
      throw new TypeError("configuration size exceeded");
  }
}
