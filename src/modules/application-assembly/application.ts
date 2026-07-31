import type { MutationContext } from "../../application/core-services";
import { PlatformCoreApplication } from "../../application/core-services";
import type { Clock } from "../../core/clock";
import type { UuidV7 } from "../../core/uuidv7";
import type { IdentityDigestKeyProvider } from "../../persistence/crypto";
import { requestFingerprint, sha256Hex } from "../../persistence/crypto";
import { DomainConflictError, TenantBoundaryError } from "../../persistence/models";
import {
  ApplicationAssemblyError,
  type ApplicationConfigurationRecord,
  type ApplicationDashboard,
  type ApplicationDashboardModule,
  type ApplicationModuleRecord,
  type ApplicationNavigationItem,
  type ApplicationRecord,
  type ModuleAccessDecision,
  type ModuleCatalogRecord,
  type ModuleEntitlementStatus,
  type RegisterModuleInput,
} from "./models";
import {
  ApplicationAssemblyRepository,
  type ModuleAccessSnapshot,
  type ModuleDependencyRecord,
} from "./repository";

const TRUSTED_APPLICATION_CONTEXT = Symbol("trusted-application-context");
const MANAGE_PERMISSION = "tenant:update";
const MAX_NAVIGATION_ITEMS = 100;
const SAFE_KEY = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
const SECRET_KEY = /(secret|token|password|credential|private[_-]?key)/iu;

export interface TrustedApplicationContext {
  readonly tenantId: string;
  readonly applicationId: string;
  readonly trustMarker: symbol;
}

function nowMs(clock: Clock): number {
  return clock.now().getTime();
}

function isValidEntitlement(
  assignment: ApplicationModuleRecord | null,
  timestamp: number,
): boolean {
  if (!assignment) return false;
  if (
    assignment.entitlementStatus === "included"
    || assignment.entitlementStatus === "purchased"
  ) {
    return true;
  }
  return (
    assignment.entitlementStatus === "trial"
    && assignment.entitlementExpiresAt !== null
    && assignment.entitlementExpiresAt > timestamp
  );
}

function valueType(
  value: unknown,
): ApplicationConfigurationRecord["valueType"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  if (typeof value === "string") return "string";
  return "json";
}

function containsSecretShape(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsSecretShape);
  return Object.entries(value).some(
    ([key, nested]) => SECRET_KEY.test(key) || containsSecretShape(nested),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class ApplicationAssemblyApplication extends PlatformCoreApplication {
  readonly applicationRepository: ApplicationAssemblyRepository;

  constructor(
    db: D1Database,
    clock: Clock,
    uuidv7: UuidV7,
    identityKeys: IdentityDigestKeyProvider,
  ) {
    super(db, clock, uuidv7, identityKeys);
    this.applicationRepository = new ApplicationAssemblyRepository(db);
  }

  private async replayResult<T>(
    tenantId: string,
    operation: string,
    fingerprintInput: unknown,
    context: MutationContext,
  ): Promise<T | null> {
    const keyHash = await sha256Hex(context.idempotencyKey);
    const fingerprint = await requestFingerprint(fingerprintInput);
    const existing = await this.repositories.idempotency.findTenant(
      tenantId, operation, keyHash,
    );
    if (!existing) return null;
    if (existing.requestFingerprint !== fingerprint) {
      throw new DomainConflictError("IDEMPOTENCY_CONFLICT");
    }
    if (existing.status === "completed" && existing.storedResultJson) {
      return JSON.parse(existing.storedResultJson) as T;
    }
    return null;
  }

  private validateKey(name: string, value: string, max = 80): void {
    if (!SAFE_KEY.test(value) || value.length > max) {
      throw new TypeError(`${name} is invalid`);
    }
  }

  private async requireManagePermission(
    tenantId: string,
    membershipId: string,
  ): Promise<void> {
    const tenant = await this.repositories.tenants.getById(tenantId);
    if (!tenant) throw new TenantBoundaryError();
    if (
      tenant.status !== "active"
      || !(await this.checkPermission(tenantId, membershipId, MANAGE_PERMISSION))
    ) {
      throw new ApplicationAssemblyError("MODULE_PERMISSION_DENIED");
    }
  }

  private async requireApplication(
    tenantId: string,
    applicationId: string,
  ): Promise<ApplicationRecord> {
    const application = await this.applicationRepository.getApplication(
      tenantId,
      applicationId,
    );
    if (!application) {
      throw new ApplicationAssemblyError("APPLICATION_SCOPE_DENIED");
    }
    return application;
  }

  private validateManifest(input: RegisterModuleInput): string {
    if (
      input.navigationManifest.items.length === 0
      || input.navigationManifest.items.length > 20
    ) {
      throw new TypeError("navigation manifest size is invalid");
    }
    const keys = new Set<string>();
    for (const item of input.navigationManifest.items) {
      this.validateKey("navigation item key", item.itemKey, 80);
      if (keys.has(item.itemKey)) {
        throw new TypeError("navigation item key is duplicated");
      }
      keys.add(item.itemKey);
      if (!item.label.trim() || item.label.length > 80) {
        throw new TypeError("navigation label is invalid");
      }
      if (
        !item.path.startsWith("/")
        || item.path.length > 200
        || item.path.includes("://")
      ) {
        throw new TypeError("navigation path is invalid");
      }
    }
    const serialized = JSON.stringify(input.navigationManifest);
    if (serialized.length > 8192) {
      throw new TypeError("navigation manifest is too large");
    }
    return serialized;
  }

  async createApplication(
    tenantId: string,
    actorMembershipId: string,
    applicationKey: string,
    name: string,
    context: MutationContext,
  ): Promise<ApplicationRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    this.validateKey("application key", applicationKey);
    if (!name.trim() || name.length > 120) {
      throw new TypeError("application name is invalid");
    }
    const id = this.uuidv7.generate();
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.create",
      { tenantId, actorMembershipId, applicationKey, name },
      context,
      (timestamp) => ({
        result: {
          id,
          tenantId,
          applicationKey,
          name,
          status: "active",
          version: 1,
          createdAt: timestamp,
          updatedAt: timestamp,
          suspendedAt: null,
        } satisfies ApplicationRecord,
        statements: [
          this.db
            .prepare(
              `INSERT INTO applications (
                id, tenant_id, application_key, name, status, version,
                created_at, updated_at, suspended_at
              ) VALUES (?1, ?2, ?3, ?4, 'active', 1, ?5, ?5, NULL)`,
            )
            .bind(id, tenantId, applicationKey, name, timestamp),
        ],
        audit: {
          action: "application.create",
          resourceType: "application",
          resourceReference: id,
          reasonCode: "CREATED",
        },
      }),
    );
  }

  async suspendApplication(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    context: MutationContext,
  ): Promise<ApplicationRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const current = await this.requireApplication(tenantId, applicationId);
    if (current.status !== "active") {
      throw new ApplicationAssemblyError("APPLICATION_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.suspend",
      { tenantId, actorMembershipId, applicationId },
      context,
      (timestamp) => ({
        result: {
          ...current,
          status: "suspended",
          version: current.version + 1,
          updatedAt: timestamp,
          suspendedAt: timestamp,
        },
        statements: [
          this.db
            .prepare(
              `UPDATE applications
               SET status = 'suspended', suspended_at = ?1,
                   version = version + 1, updated_at = ?1
               WHERE tenant_id = ?2 AND id = ?3 AND status = 'active'`,
            )
            .bind(timestamp, tenantId, applicationId),
        ],
        audit: {
          action: "application.suspend",
          resourceType: "application",
          resourceReference: applicationId,
          reasonCode: "SUSPENDED",
        },
      }),
    );
  }

  async registerModule(
    tenantId: string,
    actorMembershipId: string,
    input: RegisterModuleInput,
    context: MutationContext,
  ): Promise<ModuleCatalogRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    this.validateKey("module key", input.moduleKey);
    if (!input.displayName.trim() || input.displayName.length > 120) {
      throw new TypeError("module display name is invalid");
    }
    if (!input.moduleVersion.trim() || input.moduleVersion.length > 40) {
      throw new TypeError("module version is invalid");
    }
    const manifestJson = this.validateManifest(input);
    const permission = await this.repositories.permissions.getByKey(
      input.accessPermissionKey,
    );
    if (!permission || permission.status !== "active") {
      throw new ApplicationAssemblyError("MODULE_PERMISSION_DENIED");
    }
    const dependencies = [...new Map(
      (input.dependencies ?? []).map((dependency) => [
        dependency.moduleKey,
        dependency,
      ]),
    ).values()];
    if (dependencies.length > 20 || dependencies.some(
      ({ moduleKey }) => moduleKey === input.moduleKey,
    )) {
      throw new TypeError("module dependencies are invalid");
    }
    dependencies.forEach(({ moduleKey }) =>
      this.validateKey("dependency module key", moduleKey)
    );
    const dependencyModules = await this.applicationRepository.listModulesByKeys(
      tenantId,
      dependencies.map(({ moduleKey }) => moduleKey),
    );
    if (dependencyModules.length !== dependencies.length) {
      throw new ApplicationAssemblyError("MODULE_DEPENDENCY_UNSATISFIED");
    }
    const id = this.uuidv7.generate();
    const dependencyByKey = new Map(
      dependencyModules.map((module) => [module.moduleKey, module]),
    );
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "module.register",
      {
        tenantId,
        actorMembershipId,
        input: {
          ...input,
          dependencies: dependencies.map(({ moduleKey }) => ({ moduleKey })),
        },
      },
      context,
      (timestamp) => ({
        result: {
          id,
          tenantId,
          moduleKey: input.moduleKey,
          displayName: input.displayName,
          moduleVersion: input.moduleVersion,
          lifecycleStatus: input.lifecycleStatus,
          availabilityStatus: input.availabilityStatus,
          accessPermissionKey: input.accessPermissionKey,
          navigationManifest: input.navigationManifest,
          version: 1,
        } satisfies ModuleCatalogRecord,
        statements: [
          this.db
            .prepare(
              `INSERT INTO module_catalog (
                id, tenant_id, module_key, display_name, module_version,
                lifecycle_status, availability_status, access_permission_key,
                navigation_manifest_json, version, created_at, updated_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?10
              )`,
            )
            .bind(
              id,
              tenantId,
              input.moduleKey,
              input.displayName,
              input.moduleVersion,
              input.lifecycleStatus,
              input.availabilityStatus,
              input.accessPermissionKey,
              manifestJson,
              timestamp,
            ),
          ...dependencies.map((dependency) =>
            this.db
              .prepare(
                `INSERT INTO module_dependencies (
                  id, tenant_id, module_catalog_id,
                  depends_on_module_catalog_id, created_at
                ) VALUES (?1, ?2, ?3, ?4, ?5)`,
              )
              .bind(
                this.uuidv7.generate(),
                tenantId,
                id,
                dependencyByKey.get(dependency.moduleKey)!.id,
                timestamp,
              )
          ),
        ],
        audit: {
          action: "module.register",
          resourceType: "module_catalog",
          resourceReference: id,
          reasonCode: "REGISTERED",
        },
      }),
    );
  }

  async grantModuleEntitlement(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    moduleKey: string,
    entitlementStatus: "included" | "purchased" | "trial",
    entitlementExpiresAt: number | null,
    context: MutationContext,
  ): Promise<ApplicationModuleRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const fingerprintInput = {
      tenantId, actorMembershipId, applicationId, moduleKey,
      entitlementStatus, entitlementExpiresAt,
    };
    const replay = await this.replayResult<ApplicationModuleRecord>(
      tenantId, "application.module.entitlement.grant", fingerprintInput, context,
    );
    if (replay) return replay;
    await this.requireApplication(tenantId, applicationId);
    const module = await this.applicationRepository.getModuleByKey(
      tenantId,
      moduleKey,
    );
    if (!module) throw new ApplicationAssemblyError("MODULE_SCOPE_DENIED");
    const timestamp = nowMs(this.clock);
    if (
      (entitlementStatus === "trial"
        && (entitlementExpiresAt === null || entitlementExpiresAt <= timestamp))
      || (entitlementStatus !== "trial" && entitlementExpiresAt !== null)
    ) {
      throw new TypeError("entitlement expiration is invalid");
    }
    const current = await this.applicationRepository.getApplicationModule(
      tenantId,
      applicationId,
      module.id,
    );
    if (
      current
      && current.entitlementStatus !== "expired"
      && current.entitlementStatus !== "revoked"
    ) {
      throw new ApplicationAssemblyError("MODULE_INVALID_STATE");
    }
    const id = current?.id ?? this.uuidv7.generate();
    const version = (current?.version ?? 0) + 1;
    const historyId = this.uuidv7.generate();
    const result = {
      id,
      tenantId,
      applicationId,
      moduleCatalogId: module.id,
      entitlementStatus,
      entitlementExpiresAt,
      enablementStatus: "disabled",
      version,
    } satisfies ApplicationModuleRecord;
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.module.entitlement.grant",
      {
        tenantId,
        actorMembershipId,
        applicationId,
        moduleKey,
        entitlementStatus,
        entitlementExpiresAt,
      },
      context,
      (committedAt) => ({
        result,
        statements: [
          current
            ? this.db
                .prepare(
                  `UPDATE application_modules
                   SET entitlement_status = ?1, entitlement_expires_at = ?2,
                       enablement_status = 'disabled', version = version + 1,
                       updated_at = ?3
                   WHERE tenant_id = ?4 AND id = ?5
                     AND version = ?6
                     AND entitlement_status IN ('expired', 'revoked')`,
                )
                .bind(
                  entitlementStatus,
                  entitlementExpiresAt,
                  committedAt,
                  tenantId,
                  id,
                  current.version,
                )
            : this.db
                .prepare(
                  `INSERT INTO application_modules (
                    id, tenant_id, application_id, module_catalog_id,
                    entitlement_status, entitlement_expires_at,
                    enablement_status, version, created_at, updated_at
                  ) VALUES (
                    ?1, ?2, ?3, ?4, ?5, ?6, 'disabled', 1, ?7, ?7
                  )`,
                )
                .bind(
                  id,
                  tenantId,
                  applicationId,
                  module.id,
                  entitlementStatus,
                  entitlementExpiresAt,
                  committedAt,
                ),
          this.db
            .prepare(
              `INSERT INTO module_entitlement_history (
                id, tenant_id, application_module_id, previous_status,
                new_status, application_module_version,
                entitlement_expires_at, reason_code,
                changed_by_membership_id, changed_at, created_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7,
                'ENTITLEMENT_GRANTED', ?8, ?9, ?9
              )`,
            )
            .bind(
              historyId,
              tenantId,
              id,
              current?.entitlementStatus ?? null,
              entitlementStatus,
              version,
              entitlementExpiresAt,
              actorMembershipId,
              committedAt,
            ),
        ],
        audit: {
          action: "application.module.entitlement.grant",
          resourceType: "application_module",
          resourceReference: id,
          reasonCode: "ENTITLEMENT_GRANTED",
        },
      }),
    );
  }

  async revokeModuleEntitlement(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    moduleKey: string,
    finalStatus: "expired" | "revoked",
    context: MutationContext,
  ): Promise<ApplicationModuleRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const fingerprintInput = {
      tenantId, actorMembershipId, applicationId, moduleKey, finalStatus,
    };
    const replay = await this.replayResult<ApplicationModuleRecord>(
      tenantId, "application.module.entitlement.revoke", fingerprintInput, context,
    );
    if (replay) return replay;
    const module = await this.applicationRepository.getModuleByKey(
      tenantId,
      moduleKey,
    );
    if (!module) throw new ApplicationAssemblyError("MODULE_SCOPE_DENIED");
    const current = await this.applicationRepository.getApplicationModule(
      tenantId,
      applicationId,
      module.id,
    );
    if (
      !current
      || current.entitlementStatus === "expired"
      || current.entitlementStatus === "revoked"
    ) {
      throw new ApplicationAssemblyError("MODULE_INVALID_STATE");
    }
    const version = current.version + 1;
    const result = {
      ...current,
      entitlementStatus: finalStatus,
      enablementStatus: "disabled",
      version,
    } satisfies ApplicationModuleRecord;
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.module.entitlement.revoke",
      { tenantId, actorMembershipId, applicationId, moduleKey, finalStatus },
      context,
      (timestamp) => ({
        result,
        statements: [
          this.db
            .prepare(
              `UPDATE application_modules
               SET entitlement_status = ?1, enablement_status = 'disabled',
                   version = version + 1, updated_at = ?2
               WHERE tenant_id = ?3 AND application_id = ?4
                 AND module_catalog_id = ?5 AND version = ?6
                 AND entitlement_status IN ('included', 'purchased', 'trial')`,
            )
            .bind(
              finalStatus,
              timestamp,
              tenantId,
              applicationId,
              module.id,
              current.version,
            ),
          this.db
            .prepare(
              `INSERT INTO module_entitlement_history (
                id, tenant_id, application_module_id, previous_status,
                new_status, application_module_version,
                entitlement_expires_at, reason_code,
                changed_by_membership_id, changed_at, created_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10
              )`,
            )
            .bind(
              this.uuidv7.generate(),
              tenantId,
              current.id,
              current.entitlementStatus,
              finalStatus,
              version,
              current.entitlementExpiresAt,
              finalStatus === "expired"
                ? "ENTITLEMENT_EXPIRED"
                : "ENTITLEMENT_REVOKED",
              actorMembershipId,
              timestamp,
            ),
        ],
        audit: {
          action: "application.module.entitlement.revoke",
          resourceType: "application_module",
          resourceReference: current.id,
          reasonCode: finalStatus === "expired"
            ? "ENTITLEMENT_EXPIRED"
            : "ENTITLEMENT_REVOKED",
        },
      }),
    );
  }

  async enableModule(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    moduleKey: string,
    context: MutationContext,
  ): Promise<ApplicationModuleRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const replay = await this.replayResult<ApplicationModuleRecord>(
      tenantId, "application.module.enable",
      { tenantId, actorMembershipId, applicationId, moduleKey }, context,
    );
    if (replay) return replay;
    const snapshot = await this.requireOperationalSnapshot(
      tenantId,
      applicationId,
      moduleKey,
      false,
    );
    if (!snapshot.assignment) {
      throw new ApplicationAssemblyError("MODULE_NOT_ENTITLED");
    }
    if (snapshot.assignment.enablementStatus === "enabled") {
      throw new ApplicationAssemblyError("MODULE_INVALID_STATE");
    }
    const result = {
      ...snapshot.assignment,
      enablementStatus: "enabled",
      version: snapshot.assignment.version + 1,
    } satisfies ApplicationModuleRecord;
    try {
      return await this.executeIdempotent(
        { scopeType: "tenant", tenantId },
        "application.module.enable",
        { tenantId, actorMembershipId, applicationId, moduleKey },
        context,
        (timestamp) => ({
          result,
          statements: [
            this.db
              .prepare(
                `UPDATE application_modules
                 SET enablement_status = 'enabled', version = version + 1,
                     updated_at = ?1
                 WHERE tenant_id = ?2 AND application_id = ?3
                   AND module_catalog_id = ?4
                   AND enablement_status = 'disabled'`,
              )
              .bind(timestamp, tenantId, applicationId, snapshot.module.id),
          ],
          audit: {
            action: "application.module.enable",
            resourceType: "application_module",
            resourceReference: snapshot.assignment?.id as string,
            reasonCode: "ENABLED",
          },
        }),
      );
    } catch (error) {
      const message = errorMessage(error);
      if (message.includes("application_module_dependency_unsatisfied")) {
        throw new ApplicationAssemblyError("MODULE_DEPENDENCY_UNSATISFIED");
      }
      if (message.includes("application_module_enable_guard")) {
        throw new ApplicationAssemblyError("MODULE_NOT_ENTITLED");
      }
      throw error;
    }
  }

  async disableModule(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    moduleKey: string,
    context: MutationContext,
  ): Promise<ApplicationModuleRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    const replay = await this.replayResult<ApplicationModuleRecord>(
      tenantId, "application.module.disable",
      { tenantId, actorMembershipId, applicationId, moduleKey }, context,
    );
    if (replay) return replay;
    const module = await this.applicationRepository.getModuleByKey(
      tenantId,
      moduleKey,
    );
    if (!module) throw new ApplicationAssemblyError("MODULE_SCOPE_DENIED");
    const current = await this.applicationRepository.getApplicationModule(
      tenantId,
      applicationId,
      module.id,
    );
    if (!current || current.enablementStatus !== "enabled") {
      throw new ApplicationAssemblyError("MODULE_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.module.disable",
      { tenantId, actorMembershipId, applicationId, moduleKey },
      context,
      (timestamp) => ({
        result: {
          ...current,
          enablementStatus: "disabled",
          version: current.version + 1,
        },
        statements: [
          this.db
            .prepare(
              `UPDATE application_modules
               SET enablement_status = 'disabled', version = version + 1,
                   updated_at = ?1
               WHERE tenant_id = ?2 AND application_id = ?3
                 AND module_catalog_id = ?4
                 AND enablement_status = 'enabled'`,
            )
            .bind(timestamp, tenantId, applicationId, module.id),
        ],
        audit: {
          action: "application.module.disable",
          resourceType: "application_module",
          resourceReference: current.id,
          reasonCode: "DISABLED",
        },
      }),
    );
  }

  private evaluateSnapshot(
    snapshot: ModuleAccessSnapshot,
    timestamp: number,
  ): ModuleAccessDecision {
    const base = {
      applicationId: snapshot.application.id,
      moduleKey: snapshot.module.moduleKey,
    };
    if (snapshot.application.status !== "active") {
      return { ...base, allowed: false, reason: "APPLICATION_NOT_ACTIVE" };
    }
    if (snapshot.module.availabilityStatus !== "available") {
      return { ...base, allowed: false, reason: "MODULE_NOT_AVAILABLE" };
    }
    if (!isValidEntitlement(snapshot.assignment, timestamp)) {
      return { ...base, allowed: false, reason: "MODULE_NOT_ENTITLED" };
    }
    if (snapshot.assignment?.enablementStatus !== "enabled") {
      return { ...base, allowed: false, reason: "MODULE_NOT_ENABLED" };
    }
    if (!snapshot.dependenciesSatisfied) {
      return {
        ...base,
        allowed: false,
        reason: "MODULE_DEPENDENCY_UNSATISFIED",
      };
    }
    return { ...base, allowed: true, reason: "ALLOWED" };
  }

  private async requireOperationalSnapshot(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    requireEnabled: boolean,
  ): Promise<ModuleAccessSnapshot> {
    const timestamp = nowMs(this.clock);
    const snapshot = await this.applicationRepository.getAccessSnapshot(
      tenantId,
      applicationId,
      moduleKey,
      timestamp,
    );
    if (!snapshot) {
      throw new ApplicationAssemblyError("APPLICATION_SCOPE_DENIED");
    }
    if (snapshot.application.status !== "active") {
      throw new ApplicationAssemblyError("APPLICATION_INVALID_STATE");
    }
    if (snapshot.module.availabilityStatus !== "available") {
      throw new ApplicationAssemblyError("MODULE_NOT_AVAILABLE");
    }
    if (!isValidEntitlement(snapshot.assignment, timestamp)) {
      throw new ApplicationAssemblyError("MODULE_NOT_ENTITLED");
    }
    if (!snapshot.dependenciesSatisfied) {
      throw new ApplicationAssemblyError("MODULE_DEPENDENCY_UNSATISFIED");
    }
    if (
      requireEnabled
      && snapshot.assignment?.enablementStatus !== "enabled"
    ) {
      throw new ApplicationAssemblyError("MODULE_NOT_ENABLED");
    }
    return snapshot;
  }

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
    applicationId: string,
    source: string,
  ): Promise<TrustedApplicationContext> {
    if (source !== "server_route") {
      throw new ApplicationAssemblyError("UNTRUSTED_APPLICATION_CONTEXT");
    }
    await this.requireApplication(tenantId, applicationId);
    return Object.freeze({
      tenantId,
      applicationId,
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

  async setApplicationConfiguration(
    tenantId: string,
    actorMembershipId: string,
    applicationId: string,
    configurationKey: string,
    value: unknown,
    context: MutationContext,
  ): Promise<ApplicationConfigurationRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    await this.requireApplication(tenantId, applicationId);
    this.validateKey("configuration key", configurationKey, 120);
    if (SECRET_KEY.test(configurationKey) || containsSecretShape(value)) {
      throw new ApplicationAssemblyError("CONFIGURATION_SECRET_FORBIDDEN");
    }
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > 4096) {
      throw new TypeError("configuration value is invalid");
    }
    const current = await this.applicationRepository.getActiveConfiguration(
      tenantId,
      applicationId,
      configurationKey,
    );
    const id = this.uuidv7.generate();
    const type = valueType(value);
    const result = {
      id,
      tenantId,
      applicationId,
      configurationKey,
      valueType: type,
      value,
      status: "active",
      version: (current?.version ?? 0) + 1,
    } satisfies ApplicationConfigurationRecord;
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.configuration.set",
      { tenantId, actorMembershipId, applicationId, configurationKey, value },
      context,
      (timestamp) => ({
        result,
        statements: [
          ...(current
            ? [
                this.db
                  .prepare(
                    `UPDATE application_configuration
                     SET status = 'archived', archived_at = ?1,
                         updated_at = ?1
                     WHERE tenant_id = ?2 AND id = ?3 AND status = 'active'`,
                  )
                  .bind(timestamp, tenantId, current.id),
              ]
            : []),
          this.db
            .prepare(
              `INSERT INTO application_configuration (
                id, tenant_id, application_id, configuration_key,
                value_type, value_json, status, version,
                created_at, updated_at, archived_at
              ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?8, ?8, NULL
              )`,
            )
            .bind(
              id,
              tenantId,
              applicationId,
              configurationKey,
              type,
              serialized,
              result.version,
              timestamp,
            ),
        ],
        audit: {
          action: "application.configuration.set",
          resourceType: "application_configuration",
          resourceReference: `${applicationId}:${configurationKey}`,
          reasonCode: "CONFIGURATION_SET",
        },
      }),
    );
  }
}
