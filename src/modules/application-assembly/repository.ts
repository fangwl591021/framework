import type {
  ApplicationConfigurationRecord,
  ApplicationModuleRecord,
  ApplicationRecord,
  ApplicationStatus,
  ModuleAvailabilityStatus,
  ModuleCatalogRecord,
  ModuleEnablementStatus,
  ModuleEntitlementStatus,
  ModuleLifecycleStatus,
  ModuleNavigationManifest,
} from "./models";

interface ApplicationRow {
  id: string;
  tenant_id: string;
  application_key: string;
  name: string;
  status: ApplicationStatus;
  version: number;
  created_at: number;
  updated_at: number;
  suspended_at: number | null;
}

interface ModuleCatalogRow {
  id: string;
  tenant_id: string;
  module_key: string;
  display_name: string;
  module_version: string;
  lifecycle_status: ModuleLifecycleStatus;
  availability_status: ModuleAvailabilityStatus;
  access_permission_key: string;
  navigation_manifest_json: string;
  version: number;
}

interface ApplicationModuleRow {
  id: string;
  tenant_id: string;
  application_id: string;
  module_catalog_id: string;
  entitlement_status: ModuleEntitlementStatus;
  entitlement_expires_at: number | null;
  enablement_status: ModuleEnablementStatus;
  version: number;
}

interface ConfigurationRow {
  id: string;
  tenant_id: string;
  application_id: string;
  configuration_key: string;
  value_type: "boolean" | "number" | "string" | "json";
  value_json: string;
  status: "active" | "archived";
  version: number;
}

export interface ModuleAccessSnapshot {
  readonly application: ApplicationRecord;
  readonly module: ModuleCatalogRecord;
  readonly assignment: ApplicationModuleRecord | null;
  readonly dependenciesSatisfied: boolean;
}

export interface ModuleDependencyRecord {
  readonly moduleKey: string;
  readonly dependsOnModuleKey: string;
}

function application(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationKey: row.application_key,
    name: row.name,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    suspendedAt: row.suspended_at,
  };
}

function moduleCatalog(row: ModuleCatalogRow): ModuleCatalogRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    moduleKey: row.module_key,
    displayName: row.display_name,
    moduleVersion: row.module_version,
    lifecycleStatus: row.lifecycle_status,
    availabilityStatus: row.availability_status,
    accessPermissionKey: row.access_permission_key,
    navigationManifest: JSON.parse(
      row.navigation_manifest_json,
    ) as ModuleNavigationManifest,
    version: row.version,
  };
}

function applicationModule(row: ApplicationModuleRow): ApplicationModuleRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    applicationId: row.application_id,
    moduleCatalogId: row.module_catalog_id,
    entitlementStatus: row.entitlement_status,
    entitlementExpiresAt: row.entitlement_expires_at,
    enablementStatus: row.enablement_status,
    version: row.version,
  };
}

const APPLICATION_COLUMNS = `
  id, tenant_id, application_key, name, status, version,
  created_at, updated_at, suspended_at
`;

const MODULE_COLUMNS = `
  id, tenant_id, module_key, display_name, module_version,
  lifecycle_status, availability_status, access_permission_key,
  navigation_manifest_json, version
`;

const APPLICATION_MODULE_COLUMNS = `
  id, tenant_id, application_id, module_catalog_id, entitlement_status,
  entitlement_expires_at, enablement_status, version
`;

export class ApplicationAssemblyRepository {
  constructor(private readonly db: D1Database) {}

  async getApplication(
    tenantId: string,
    applicationId: string,
  ): Promise<ApplicationRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT ${APPLICATION_COLUMNS}
         FROM applications
         WHERE tenant_id = ?1 AND id = ?2
         LIMIT 1`,
      )
      .bind(tenantId, applicationId)
      .first<ApplicationRow>();
    return row ? application(row) : null;
  }

  async getModuleByKey(
    tenantId: string,
    moduleKey: string,
  ): Promise<ModuleCatalogRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT ${MODULE_COLUMNS}
         FROM module_catalog
         WHERE tenant_id = ?1 AND module_key = ?2
         LIMIT 1`,
      )
      .bind(tenantId, moduleKey)
      .first<ModuleCatalogRow>();
    return row ? moduleCatalog(row) : null;
  }

  async listModulesByKeys(
    tenantId: string,
    moduleKeys: readonly string[],
  ): Promise<readonly ModuleCatalogRecord[]> {
    const boundedKeys = [...new Set(moduleKeys)].slice(0, 50);
    if (boundedKeys.length === 0) return [];
    const placeholders = boundedKeys.map((_, index) => `?${index + 2}`).join(", ");
    const result = await this.db
      .prepare(
        `SELECT ${MODULE_COLUMNS}
         FROM module_catalog
         WHERE tenant_id = ?1 AND module_key IN (${placeholders})
         ORDER BY module_key
         LIMIT 50`,
      )
      .bind(tenantId, ...boundedKeys)
      .all<ModuleCatalogRow>();
    return result.results.map(moduleCatalog);
  }

  async getApplicationModule(
    tenantId: string,
    applicationId: string,
    moduleCatalogId: string,
  ): Promise<ApplicationModuleRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT ${APPLICATION_MODULE_COLUMNS}
         FROM application_modules
         WHERE tenant_id = ?1 AND application_id = ?2
           AND module_catalog_id = ?3
         LIMIT 1`,
      )
      .bind(tenantId, applicationId, moduleCatalogId)
      .first<ApplicationModuleRow>();
    return row ? applicationModule(row) : null;
  }

  async getAccessSnapshot(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
    timestamp: number,
  ): Promise<ModuleAccessSnapshot | null> {
    const row = await this.db
      .prepare(
        `SELECT
           application.id AS application_id,
           application.tenant_id AS application_tenant_id,
           application.application_key,
           application.name AS application_name,
           application.status AS application_status,
           application.version AS application_version,
           application.created_at AS application_created_at,
           application.updated_at AS application_updated_at,
           application.suspended_at,
           catalog.id AS catalog_id,
           catalog.tenant_id AS catalog_tenant_id,
           catalog.module_key,
           catalog.display_name,
           catalog.module_version,
           catalog.lifecycle_status,
           catalog.availability_status,
           catalog.access_permission_key,
           catalog.navigation_manifest_json,
           catalog.version AS catalog_version,
           assignment.id AS assignment_id,
           assignment.entitlement_status,
           assignment.entitlement_expires_at,
           assignment.enablement_status,
           assignment.version AS assignment_version,
           CASE WHEN NOT EXISTS (
             SELECT 1
             FROM module_dependencies AS dependency
             WHERE dependency.tenant_id = application.tenant_id
               AND dependency.module_catalog_id = catalog.id
               AND NOT EXISTS (
                 SELECT 1
                 FROM application_modules AS required
                 JOIN module_catalog AS required_catalog
                   ON required_catalog.tenant_id = required.tenant_id
                  AND required_catalog.id = required.module_catalog_id
                 WHERE required.tenant_id = application.tenant_id
                   AND required.application_id = application.id
                   AND required.module_catalog_id =
                     dependency.depends_on_module_catalog_id
                   AND required.enablement_status = 'enabled'
                   AND required_catalog.availability_status = 'available'
                   AND (
                     required.entitlement_status IN ('included', 'purchased')
                     OR (
                       required.entitlement_status = 'trial'
                       AND required.entitlement_expires_at > ?4
                     )
                   )
               )
           ) THEN 1 ELSE 0 END AS dependencies_satisfied
         FROM applications AS application
         JOIN module_catalog AS catalog
           ON catalog.tenant_id = application.tenant_id
          AND catalog.module_key = ?3
         LEFT JOIN application_modules AS assignment
           ON assignment.tenant_id = application.tenant_id
          AND assignment.application_id = application.id
          AND assignment.module_catalog_id = catalog.id
         WHERE application.tenant_id = ?1 AND application.id = ?2
         LIMIT 1`,
      )
      .bind(tenantId, applicationId, moduleKey, timestamp)
      .first<{
        application_id: string;
        application_tenant_id: string;
        application_key: string;
        application_name: string;
        application_status: ApplicationStatus;
        application_version: number;
        application_created_at: number;
        application_updated_at: number;
        suspended_at: number | null;
        catalog_id: string;
        catalog_tenant_id: string;
        module_key: string;
        display_name: string;
        module_version: string;
        lifecycle_status: ModuleLifecycleStatus;
        availability_status: ModuleAvailabilityStatus;
        access_permission_key: string;
        navigation_manifest_json: string;
        catalog_version: number;
        assignment_id: string | null;
        entitlement_status: ModuleEntitlementStatus | null;
        entitlement_expires_at: number | null;
        enablement_status: ModuleEnablementStatus | null;
        assignment_version: number | null;
        dependencies_satisfied: number;
      }>();
    if (!row) return null;
    return {
      application: application({
        id: row.application_id,
        tenant_id: row.application_tenant_id,
        application_key: row.application_key,
        name: row.application_name,
        status: row.application_status,
        version: row.application_version,
        created_at: row.application_created_at,
        updated_at: row.application_updated_at,
        suspended_at: row.suspended_at,
      }),
      module: moduleCatalog({
        id: row.catalog_id,
        tenant_id: row.catalog_tenant_id,
        module_key: row.module_key,
        display_name: row.display_name,
        module_version: row.module_version,
        lifecycle_status: row.lifecycle_status,
        availability_status: row.availability_status,
        access_permission_key: row.access_permission_key,
        navigation_manifest_json: row.navigation_manifest_json,
        version: row.catalog_version,
      }),
      assignment: row.assignment_id
        ? applicationModule({
            id: row.assignment_id,
            tenant_id: row.application_tenant_id,
            application_id: row.application_id,
            module_catalog_id: row.catalog_id,
            entitlement_status: row.entitlement_status as ModuleEntitlementStatus,
            entitlement_expires_at: row.entitlement_expires_at,
            enablement_status: row.enablement_status as ModuleEnablementStatus,
            version: row.assignment_version as number,
          })
        : null,
      dependenciesSatisfied: row.dependencies_satisfied === 1,
    };
  }

  async listOperationalModules(
    tenantId: string,
    applicationId: string,
    timestamp: number,
    limit: number,
  ): Promise<readonly ModuleCatalogRecord[]> {
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const result = await this.db
      .prepare(
        `SELECT
           catalog.id, catalog.tenant_id, catalog.module_key,
           catalog.display_name, catalog.module_version,
           catalog.lifecycle_status, catalog.availability_status,
           catalog.access_permission_key, catalog.navigation_manifest_json,
           catalog.version
         FROM applications AS application
         JOIN application_modules AS assignment
           ON assignment.tenant_id = application.tenant_id
          AND assignment.application_id = application.id
         JOIN module_catalog AS catalog
           ON catalog.tenant_id = assignment.tenant_id
          AND catalog.id = assignment.module_catalog_id
         WHERE application.tenant_id = ?1
           AND application.id = ?2
           AND application.status = 'active'
           AND catalog.availability_status = 'available'
           AND assignment.enablement_status = 'enabled'
           AND (
             assignment.entitlement_status IN ('included', 'purchased')
             OR (
               assignment.entitlement_status = 'trial'
               AND assignment.entitlement_expires_at > ?3
             )
           )
           AND NOT EXISTS (
             SELECT 1
             FROM module_dependencies AS dependency
             WHERE dependency.tenant_id = assignment.tenant_id
               AND dependency.module_catalog_id = assignment.module_catalog_id
               AND NOT EXISTS (
                 SELECT 1
                 FROM application_modules AS required
                 JOIN module_catalog AS required_catalog
                   ON required_catalog.tenant_id = required.tenant_id
                  AND required_catalog.id = required.module_catalog_id
                 WHERE required.tenant_id = assignment.tenant_id
                   AND required.application_id = assignment.application_id
                   AND required.module_catalog_id =
                     dependency.depends_on_module_catalog_id
                   AND required.enablement_status = 'enabled'
                   AND required_catalog.availability_status = 'available'
                   AND (
                     required.entitlement_status IN ('included', 'purchased')
                     OR (
                       required.entitlement_status = 'trial'
                       AND required.entitlement_expires_at > ?3
                     )
                   )
               )
           )
         ORDER BY catalog.module_key
         LIMIT ?4`,
      )
      .bind(tenantId, applicationId, timestamp, boundedLimit)
      .all<ModuleCatalogRow>();
    return result.results.map(moduleCatalog);
  }

  async listDependencies(
    tenantId: string,
    moduleCatalogId: string,
  ): Promise<readonly ModuleDependencyRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT module.module_key,
                dependency_module.module_key AS depends_on_module_key
         FROM module_dependencies AS dependency
         JOIN module_catalog AS module
           ON module.tenant_id = dependency.tenant_id
          AND module.id = dependency.module_catalog_id
         JOIN module_catalog AS dependency_module
           ON dependency_module.tenant_id = dependency.tenant_id
          AND dependency_module.id = dependency.depends_on_module_catalog_id
         WHERE dependency.tenant_id = ?1
           AND dependency.module_catalog_id = ?2
         ORDER BY dependency_module.module_key
         LIMIT 50`,
      )
      .bind(tenantId, moduleCatalogId)
      .all<{
        module_key: string;
        depends_on_module_key: string;
      }>();
    return result.results.map((row) => ({
      moduleKey: row.module_key,
      dependsOnModuleKey: row.depends_on_module_key,
    }));
  }

  async getActiveConfiguration(
    tenantId: string,
    applicationId: string,
    configurationKey: string,
  ): Promise<ApplicationConfigurationRecord | null> {
    const row = await this.db
      .prepare(
        `SELECT id, tenant_id, application_id, configuration_key,
                value_type, value_json, status, version
         FROM application_configuration
         WHERE tenant_id = ?1 AND application_id = ?2
           AND configuration_key = ?3 AND status = 'active'
         LIMIT 1`,
      )
      .bind(tenantId, applicationId, configurationKey)
      .first<ConfigurationRow>();
    return row
      ? {
          id: row.id,
          tenantId: row.tenant_id,
          applicationId: row.application_id,
          configurationKey: row.configuration_key,
          valueType: row.value_type,
          value: JSON.parse(row.value_json) as unknown,
          status: row.status,
          version: row.version,
        }
      : null;
  }
}
