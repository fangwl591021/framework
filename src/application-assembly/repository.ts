import type {
  CatalogModule,
  ModuleEnablement,
  ModuleEntitlement,
  TenantApplication,
} from "./models";

type AppRow = {
  id: string;
  tenant_id: string;
  application_key: string;
  name: string;
  status: TenantApplication["status"];
  default_locale: string;
  configuration_reference: string | null;
  version: number;
  created_at: number;
  updated_at: number;
};
type CatalogRow = {
  module_key: string;
  display_name: string;
  version: string;
  category: CatalogModule["category"];
  lifecycle_status: CatalogModule["lifecycleStatus"];
  availability_status: CatalogModule["availabilityStatus"];
  contract_version: string;
  configuration_schema_version: string;
  navigation_manifest_version: string;
};
type EntRow = {
  id: string;
  tenant_id: string;
  application_id: string;
  module_key: string;
  entitlement_status: ModuleEntitlement["status"];
  valid_from: number;
  valid_until: number | null;
  version: number;
};
type EnableRow = {
  id: string;
  tenant_id: string;
  application_id: string;
  module_key: string;
  enablement_status: ModuleEnablement["status"];
  version: number;
};

const app = (r: AppRow): TenantApplication => ({
  id: r.id,
  tenantId: r.tenant_id,
  applicationKey: r.application_key,
  name: r.name,
  status: r.status,
  defaultLocale: r.default_locale,
  configurationReference: r.configuration_reference,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const catalog = (r: CatalogRow): CatalogModule => ({
  moduleKey: r.module_key,
  displayName: r.display_name,
  version: r.version,
  category: r.category,
  lifecycleStatus: r.lifecycle_status,
  availabilityStatus: r.availability_status,
  contractVersion: r.contract_version,
  configurationSchemaVersion: r.configuration_schema_version,
  navigationManifestVersion: r.navigation_manifest_version,
});
const entitlement = (r: EntRow): ModuleEntitlement => ({
  id: r.id,
  tenantId: r.tenant_id,
  applicationId: r.application_id,
  moduleKey: r.module_key,
  status: r.entitlement_status,
  validFrom: r.valid_from,
  validUntil: r.valid_until,
  version: r.version,
});
const enablement = (r: EnableRow): ModuleEnablement => ({
  id: r.id,
  tenantId: r.tenant_id,
  applicationId: r.application_id,
  moduleKey: r.module_key,
  status: r.enablement_status,
  version: r.version,
});

export class ApplicationAssemblyRepository {
  constructor(private readonly db: D1Database) {}
  async getApplication(tenantId: string, id: string) {
    const r = await this.db
      .prepare(
        "SELECT id,tenant_id,application_key,name,status,default_locale,configuration_reference,version,created_at,updated_at FROM applications WHERE tenant_id=?1 AND id=?2",
      )
      .bind(tenantId, id)
      .first<AppRow>();
    return r ? app(r) : null;
  }
  async listApplications(tenantId: string, limit = 50, after = "") {
    const n = Math.max(1, Math.min(100, limit));
    const r = await this.db
      .prepare(
        "SELECT id,tenant_id,application_key,name,status,default_locale,configuration_reference,version,created_at,updated_at FROM applications WHERE tenant_id=?1 AND id>?2 ORDER BY id LIMIT ?3",
      )
      .bind(tenantId, after, n)
      .all<AppRow>();
    return r.results.map(app);
  }
  async getModule(moduleKey: string) {
    const r = await this.db
      .prepare(
        "SELECT module_key,display_name,version,category,lifecycle_status,availability_status,contract_version,configuration_schema_version,navigation_manifest_version FROM module_catalog WHERE module_key=?1",
      )
      .bind(moduleKey)
      .first<CatalogRow>();
    return r ? catalog(r) : null;
  }
  async listModules(limit = 50, after = "") {
    const n = Math.max(1, Math.min(100, limit));
    const r = await this.db
      .prepare(
        "SELECT module_key,display_name,version,category,lifecycle_status,availability_status,contract_version,configuration_schema_version,navigation_manifest_version FROM module_catalog WHERE module_key>?1 ORDER BY module_key LIMIT ?2",
      )
      .bind(after, n)
      .all<CatalogRow>();
    return r.results.map(catalog);
  }
  async getEntitlement(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
  ) {
    const r = await this.db
      .prepare(
        "SELECT id,tenant_id,application_id,module_key,entitlement_status,valid_from,valid_until,version FROM application_module_entitlements WHERE tenant_id=?1 AND application_id=?2 AND module_key=?3 ORDER BY created_at DESC,id DESC LIMIT 1",
      )
      .bind(tenantId, applicationId, moduleKey)
      .first<EntRow>();
    return r ? entitlement(r) : null;
  }
  async getEnablement(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
  ) {
    const r = await this.db
      .prepare(
        "SELECT id,tenant_id,application_id,module_key,enablement_status,version FROM application_module_enablements WHERE tenant_id=?1 AND application_id=?2 AND module_key=?3",
      )
      .bind(tenantId, applicationId, moduleKey)
      .first<EnableRow>();
    return r ? enablement(r) : null;
  }
  async listEnabledModules(tenantId: string, applicationId: string) {
    const r = await this.db
      .prepare(
        "SELECT c.module_key,c.display_name,c.version,c.category,c.lifecycle_status,c.availability_status,c.contract_version,c.configuration_schema_version,c.navigation_manifest_version FROM application_module_enablements e JOIN module_catalog c ON c.module_key=e.module_key WHERE e.tenant_id=?1 AND e.application_id=?2 AND e.enablement_status='enabled' ORDER BY c.module_key",
      )
      .bind(tenantId, applicationId)
      .all<CatalogRow>();
    return r.results.map(catalog);
  }
  async listDependencyStates(
    tenantId: string,
    applicationId: string,
    moduleKey: string,
  ) {
    return (
      await this.db
        .prepare(
          `SELECT d.dependency_module_key,d.dependency_type,c.availability_status,e.entitlement_status,e.valid_from,e.valid_until,n.enablement_status
    FROM module_dependencies d JOIN module_catalog c ON c.module_key=d.dependency_module_key
    LEFT JOIN application_module_entitlements e ON e.tenant_id=?1 AND e.application_id=?2 AND e.module_key=d.dependency_module_key AND e.entitlement_status IN ('included','purchased','trial')
    LEFT JOIN application_module_enablements n ON n.tenant_id=?1 AND n.application_id=?2 AND n.module_key=d.dependency_module_key
    WHERE d.module_key=?3 ORDER BY d.dependency_module_key LIMIT 64`,
        )
        .bind(tenantId, applicationId, moduleKey)
        .all<{
          dependency_module_key: string;
          dependency_type: "required" | "optional" | "conflict";
          availability_status: string;
          entitlement_status: string | null;
          valid_from: number | null;
          valid_until: number | null;
          enablement_status: string | null;
        }>()
    ).results;
  }
  async listVisibleModules(
    tenantId: string,
    applicationId: string,
    now: number,
  ) {
    const r = await this.db
      .prepare(
        `SELECT c.module_key,c.display_name,c.version,c.category,c.lifecycle_status,c.availability_status,c.contract_version,c.configuration_schema_version,c.navigation_manifest_version
    FROM applications a JOIN application_module_enablements n ON n.tenant_id=a.tenant_id AND n.application_id=a.id AND n.enablement_status='enabled'
    JOIN module_catalog c ON c.module_key=n.module_key AND c.availability_status='available'
    JOIN application_module_entitlements e ON e.tenant_id=a.tenant_id AND e.application_id=a.id AND e.module_key=n.module_key AND e.entitlement_status IN ('included','purchased','trial')
    WHERE a.tenant_id=?1 AND a.id=?2 AND a.status='active' AND e.valid_from<=?3 AND (e.valid_until IS NULL OR e.valid_until>?3)
    AND NOT EXISTS (SELECT 1 FROM module_dependencies d LEFT JOIN module_catalog dc ON dc.module_key=d.dependency_module_key LEFT JOIN application_module_entitlements de ON de.tenant_id=a.tenant_id AND de.application_id=a.id AND de.module_key=d.dependency_module_key AND de.entitlement_status IN ('included','purchased','trial') LEFT JOIN application_module_enablements dn ON dn.tenant_id=a.tenant_id AND dn.application_id=a.id AND dn.module_key=d.dependency_module_key WHERE d.module_key=c.module_key AND ((d.dependency_type='required' AND NOT(dc.availability_status='available' AND de.id IS NOT NULL AND de.valid_from<=?3 AND (de.valid_until IS NULL OR de.valid_until>?3) AND dn.enablement_status='enabled')) OR (d.dependency_type='conflict' AND dc.availability_status='available' AND de.id IS NOT NULL AND de.valid_from<=?3 AND (de.valid_until IS NULL OR de.valid_until>?3) AND dn.enablement_status='enabled')))
    ORDER BY c.module_key LIMIT 64`,
      )
      .bind(tenantId, applicationId, now)
      .all<CatalogRow>();
    return r.results.map(catalog);
  }
  async listMembershipPermissionKeys(tenantId: string, membershipId: string) {
    const r = await this.db
      .prepare(
        `SELECT DISTINCT p.permission_key FROM role_assignments ra JOIN tenant_memberships tm ON tm.tenant_id=ra.tenant_id AND tm.id=ra.tenant_membership_id AND tm.status='active' JOIN roles r ON r.id=ra.role_id AND r.status='active' JOIN role_permissions rp ON rp.tenant_scope_key=r.tenant_scope_key AND rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id AND p.status='active' WHERE ra.tenant_id=?1 AND ra.tenant_membership_id=?2 AND ra.status='active' ORDER BY p.permission_key LIMIT 256`,
      )
      .bind(tenantId, membershipId)
      .all<{ permission_key: string }>();
    return r.results.map((x) => x.permission_key);
  }
  async hasPath(from: string, to: string): Promise<boolean> {
    const r = await this.db
      .prepare(
        `WITH RECURSIVE graph(module_key,depth) AS (SELECT dependency_module_key,1 FROM module_dependencies WHERE module_key=?1 AND dependency_type='required' UNION ALL SELECT d.dependency_module_key,g.depth+1 FROM graph g JOIN module_dependencies d ON d.module_key=g.module_key AND d.dependency_type='required' WHERE g.depth<16) SELECT 1 found FROM graph WHERE module_key=?2 LIMIT 1`,
      )
      .bind(from, to)
      .first<{ found: number }>();
    return Boolean(r);
  }
}
