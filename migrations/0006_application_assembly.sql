PRAGMA foreign_keys = ON;

-- Application Assembly permissions are installed only by this reviewed migration.
DROP TRIGGER trg_permissions_immutable_insert;
INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at) VALUES
 ('019d0000-0000-7000-8000-000000000301','application:read','Read tenant applications','active',1788307200000,1788307200000),
 ('019d0000-0000-7000-8000-000000000302','application:manage','Manage tenant applications','active',1788307200000,1788307200000),
 ('019d0000-0000-7000-8000-000000000303','module_catalog:read','Read module catalog','active',1788307200000,1788307200000),
 ('019d0000-0000-7000-8000-000000000304','module_catalog:manage','Manage module catalog','active',1788307200000,1788307200000),
 ('019d0000-0000-7000-8000-000000000305','module_entitlement:read','Read module entitlements','active',1788307200000,1788307200000),
 ('019d0000-0000-7000-8000-000000000306','module_entitlement:manage','Manage module entitlements','active',1788307200000,1788307200000),
 ('019d0000-0000-7000-8000-000000000307','module_enablement:read','Read module enablement','active',1788307200000,1788307200000),
 ('019d0000-0000-7000-8000-000000000308','module_enablement:manage','Manage module enablement','active',1788307200000,1788307200000),
 ('019d0000-0000-7000-8000-000000000309','module_configuration:read','Read module configuration','active',1788307200000,1788307200000),
 ('019d0000-0000-7000-8000-000000000310','module_configuration:manage','Manage module configuration','active',1788307200000,1788307200000);
CREATE TRIGGER trg_permissions_immutable_insert BEFORE INSERT ON permissions
BEGIN SELECT RAISE(ABORT,'permission_vocabulary_immutable'); END;

CREATE TABLE applications (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL,
 application_key TEXT NOT NULL CHECK(length(application_key) BETWEEN 1 AND 80),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
 status TEXT NOT NULL CHECK(status IN ('active','suspended','archived')),
 default_locale TEXT NOT NULL CHECK(length(default_locale) BETWEEN 2 AND 20),
 configuration_reference TEXT CHECK(configuration_reference IS NULL OR length(configuration_reference) BETWEEN 1 AND 120),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,application_key),
 FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE module_catalog (
 module_key TEXT PRIMARY KEY CHECK(length(module_key) BETWEEN 1 AND 80),
 display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 120),
 version TEXT NOT NULL CHECK(length(version) BETWEEN 1 AND 40),
 category TEXT NOT NULL CHECK(category IN ('domain','extension')),
 lifecycle_status TEXT NOT NULL CHECK(lifecycle_status IN ('candidate','stable','deprecated')),
 availability_status TEXT NOT NULL CHECK(availability_status IN ('available','unavailable','retired')),
 contract_version TEXT NOT NULL CHECK(length(contract_version) BETWEEN 1 AND 40),
 configuration_schema_version TEXT NOT NULL CHECK(length(configuration_schema_version) BETWEEN 1 AND 40),
 navigation_manifest_version TEXT NOT NULL CHECK(length(navigation_manifest_version) BETWEEN 1 AND 40),
 version_number INTEGER NOT NULL DEFAULT 1 CHECK(version_number BETWEEN 1 AND 1000000000),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at)
);

CREATE TABLE module_dependencies (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 module_key TEXT NOT NULL, dependency_module_key TEXT NOT NULL,
 dependency_type TEXT NOT NULL CHECK(dependency_type IN ('required','optional','conflict')),
 minimum_version TEXT CHECK(minimum_version IS NULL OR length(minimum_version) BETWEEN 1 AND 40),
 created_at INTEGER NOT NULL CHECK(created_at>=0),
 UNIQUE(module_key,dependency_module_key,dependency_type),
 FOREIGN KEY(module_key) REFERENCES module_catalog(module_key) ON DELETE RESTRICT,
 FOREIGN KEY(dependency_module_key) REFERENCES module_catalog(module_key) ON DELETE RESTRICT,
 CHECK(module_key<>dependency_module_key)
);

CREATE TABLE application_module_entitlements (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, module_key TEXT NOT NULL,
 entitlement_status TEXT NOT NULL CHECK(entitlement_status IN ('included','purchased','trial','expired','revoked')),
 valid_from INTEGER NOT NULL CHECK(valid_from>=0), valid_until INTEGER,
 granted_by TEXT NOT NULL CHECK(length(granted_by) BETWEEN 1 AND 255),
 reason_code TEXT NOT NULL CHECK(length(reason_code) BETWEEN 1 AND 80),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(module_key) REFERENCES module_catalog(module_key) ON DELETE RESTRICT,
 CHECK((entitlement_status IN ('included','purchased') AND valid_until IS NULL) OR (entitlement_status='trial' AND valid_until IS NOT NULL AND valid_until>valid_from) OR entitlement_status IN ('expired','revoked')),
 CHECK(valid_until IS NULL OR valid_until>valid_from)
);

CREATE TABLE application_module_enablements (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, module_key TEXT NOT NULL,
 enablement_status TEXT NOT NULL CHECK(enablement_status IN ('enabled','disabled')),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000),
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,application_id,module_key),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(module_key) REFERENCES module_catalog(module_key) ON DELETE RESTRICT
);

CREATE TABLE module_entitlement_history (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'),
 tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, module_key TEXT NOT NULL,
 entitlement_id TEXT NOT NULL, from_status TEXT, to_status TEXT NOT NULL CHECK(to_status IN ('included','purchased','trial','expired','revoked')),
 reason_code TEXT NOT NULL CHECK(length(reason_code) BETWEEN 1 AND 80),
 actor_reference TEXT NOT NULL CHECK(length(actor_reference) BETWEEN 1 AND 255), occurred_at INTEGER NOT NULL CHECK(occurred_at>=0),
 UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(tenant_id,entitlement_id) REFERENCES application_module_entitlements(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(module_key) REFERENCES module_catalog(module_key) ON DELETE RESTRICT
);

CREATE TABLE application_configuration (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), tenant_id TEXT NOT NULL, application_id TEXT NOT NULL,
 schema_version TEXT NOT NULL CHECK(length(schema_version) BETWEEN 1 AND 40), configuration_json TEXT NOT NULL CHECK(json_valid(configuration_json) AND json_type(configuration_json)='object' AND length(configuration_json)<=8192),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000), created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,application_id), FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT
);

CREATE TABLE application_module_configuration (
 id TEXT PRIMARY KEY CHECK(length(id)=36 AND substr(id,15,1)='7'), tenant_id TEXT NOT NULL, application_id TEXT NOT NULL, module_key TEXT NOT NULL,
 schema_version TEXT NOT NULL CHECK(length(schema_version) BETWEEN 1 AND 40), configuration_json TEXT NOT NULL CHECK(json_valid(configuration_json) AND json_type(configuration_json)='object' AND length(configuration_json)<=8192),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 1000000000), created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 UNIQUE(tenant_id,application_id,module_key), FOREIGN KEY(tenant_id,application_id) REFERENCES applications(tenant_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(module_key) REFERENCES module_catalog(module_key) ON DELETE RESTRICT
);

CREATE INDEX idx_applications_tenant_status ON applications(tenant_id,status,application_key);
CREATE INDEX idx_catalog_availability ON module_catalog(availability_status,lifecycle_status,module_key);
CREATE INDEX idx_dependencies_module ON module_dependencies(module_key,dependency_type,dependency_module_key);
CREATE INDEX idx_dependencies_reverse ON module_dependencies(dependency_module_key,dependency_type,module_key);
CREATE UNIQUE INDEX uq_entitlement_current ON application_module_entitlements(tenant_id,application_id,module_key) WHERE entitlement_status IN ('included','purchased','trial');
CREATE INDEX idx_entitlement_access ON application_module_entitlements(tenant_id,application_id,module_key,entitlement_status,valid_from,valid_until);
CREATE INDEX idx_entitlement_expiry ON application_module_entitlements(entitlement_status,valid_until,tenant_id,application_id);
CREATE INDEX idx_enablement_enabled ON application_module_enablements(tenant_id,application_id,module_key) WHERE enablement_status='enabled';
CREATE INDEX idx_enablement_module ON application_module_enablements(module_key,enablement_status,tenant_id,application_id);
CREATE INDEX idx_entitlement_history_app ON module_entitlement_history(tenant_id,application_id,module_key,occurred_at DESC,id);
CREATE INDEX idx_app_config_tenant ON application_configuration(tenant_id,application_id,version);
CREATE INDEX idx_module_config_tenant ON application_module_configuration(tenant_id,application_id,module_key,version);

CREATE TRIGGER trg_application_archive_terminal BEFORE UPDATE ON applications FOR EACH ROW WHEN OLD.status='archived' AND NEW.status<>'archived' BEGIN SELECT RAISE(ABORT,'application_archive_terminal'); END;
CREATE TRIGGER trg_application_version_guard BEFORE UPDATE ON applications FOR EACH ROW WHEN NEW.version<>OLD.version+1 OR NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_key IS NOT OLD.application_key OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'application_version_conflict'); END;
CREATE TRIGGER trg_catalog_version_guard BEFORE UPDATE ON module_catalog FOR EACH ROW WHEN NEW.version_number<>OLD.version_number+1 OR NEW.module_key IS NOT OLD.module_key OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'catalog_version_conflict'); END;
CREATE TRIGGER trg_dependency_no_update BEFORE UPDATE ON module_dependencies BEGIN SELECT RAISE(ABORT,'module_dependency_immutable'); END;
CREATE TRIGGER trg_dependency_no_delete BEFORE DELETE ON module_dependencies BEGIN SELECT RAISE(ABORT,'module_dependency_immutable'); END;
CREATE TRIGGER trg_entitlement_identity_guard BEFORE UPDATE ON application_module_entitlements FOR EACH ROW WHEN NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.module_key IS NOT OLD.module_key OR NEW.granted_by IS NOT OLD.granted_by OR NEW.created_at IS NOT OLD.created_at OR NEW.version<>OLD.version+1 BEGIN SELECT RAISE(ABORT,'entitlement_identity_immutable'); END;
CREATE TRIGGER trg_entitlement_transition_guard BEFORE UPDATE OF entitlement_status ON application_module_entitlements FOR EACH ROW WHEN NEW.entitlement_status<>OLD.entitlement_status AND NOT (OLD.entitlement_status IN ('included','purchased','trial') AND NEW.entitlement_status IN ('expired','revoked')) BEGIN SELECT RAISE(ABORT,'entitlement_transition_invalid'); END;
CREATE TRIGGER trg_entitlement_no_delete BEFORE DELETE ON application_module_entitlements BEGIN SELECT RAISE(ABORT,'entitlement_history_required'); END;
CREATE TRIGGER trg_enablement_identity_guard BEFORE UPDATE ON application_module_enablements FOR EACH ROW WHEN NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.module_key IS NOT OLD.module_key OR NEW.created_at IS NOT OLD.created_at OR NEW.version<>OLD.version+1 BEGIN SELECT RAISE(ABORT,'enablement_version_conflict'); END;
CREATE TRIGGER trg_enablement_no_delete BEFORE DELETE ON application_module_enablements BEGIN SELECT RAISE(ABORT,'enablement_history_required'); END;
CREATE TRIGGER trg_entitlement_history_no_update BEFORE UPDATE ON module_entitlement_history BEGIN SELECT RAISE(ABORT,'entitlement_history_immutable'); END;
CREATE TRIGGER trg_entitlement_history_no_delete BEFORE DELETE ON module_entitlement_history BEGIN SELECT RAISE(ABORT,'entitlement_history_immutable'); END;
CREATE TRIGGER trg_app_config_version_guard BEFORE UPDATE ON application_configuration FOR EACH ROW WHEN NEW.version<>OLD.version+1 OR NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'configuration_version_conflict'); END;
CREATE TRIGGER trg_app_config_no_delete BEFORE DELETE ON application_configuration BEGIN SELECT RAISE(ABORT,'configuration_retained'); END;
CREATE TRIGGER trg_module_config_version_guard BEFORE UPDATE ON application_module_configuration FOR EACH ROW WHEN NEW.version<>OLD.version+1 OR NEW.id IS NOT OLD.id OR NEW.tenant_id IS NOT OLD.tenant_id OR NEW.application_id IS NOT OLD.application_id OR NEW.module_key IS NOT OLD.module_key OR NEW.created_at IS NOT OLD.created_at BEGIN SELECT RAISE(ABORT,'configuration_version_conflict'); END;
CREATE TRIGGER trg_module_config_no_delete BEFORE DELETE ON application_module_configuration BEGIN SELECT RAISE(ABORT,'configuration_retained'); END;
