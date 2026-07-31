import type { MutationContext } from "../../application/core-services";
import {
  ApplicationAssemblyError,
  type ApplicationRecord,
  type ModuleCatalogRecord,
  type RegisterModuleInput,
} from "./models";
import { ApplicationAssemblyBase } from "./application-base";

export class ApplicationAdminApplication extends ApplicationAssemblyBase {
  async createApplication(
    tenantId: string,
    actorMembershipId: string,
    applicationKey: string,
    name: string,
    context: MutationContext,
  ): Promise<ApplicationRecord> {
    await this.requireManagePermission(tenantId, actorMembershipId);
    this.validateSlugKey("application key", applicationKey);
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
    const fingerprintInput = {
      tenantId, actorMembershipId, applicationId,
    };
    const replay = await this.replayResult<ApplicationRecord>(
      tenantId, "application.suspend", fingerprintInput, context,
    );
    if (replay) return replay;
    const current = await this.requireApplication(tenantId, applicationId);
    if (current.status !== "active") {
      throw new ApplicationAssemblyError("APPLICATION_INVALID_STATE");
    }
    return this.executeIdempotent(
      { scopeType: "tenant", tenantId },
      "application.suspend",
      fingerprintInput,
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
    this.validateSlugKey("module key", input.moduleKey);
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
      this.validateSlugKey("dependency module key", moduleKey)
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

}
