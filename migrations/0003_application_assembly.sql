PRAGMA foreign_keys = ON;

CREATE TABLE applications (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  application_key TEXT NOT NULL CHECK (
    length(application_key) BETWEEN 1 AND 80
    AND application_key = lower(application_key)
    AND application_key NOT GLOB '*[^a-z0-9-]*'
  ),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  suspended_at INTEGER,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (status = 'active' AND suspended_at IS NULL)
    OR (status = 'suspended' AND suspended_at IS NOT NULL)
  )
);

CREATE TABLE module_catalog (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  module_key TEXT NOT NULL CHECK (
    length(module_key) BETWEEN 1 AND 80
    AND module_key = lower(module_key)
    AND module_key NOT GLOB '*[^a-z0-9-]*'
  ),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  module_version TEXT NOT NULL CHECK (length(module_version) BETWEEN 1 AND 40),
  lifecycle_status TEXT NOT NULL CHECK (
    lifecycle_status IN (
      'candidate', 'experimental', 'stable', 'core_approved',
      'deprecated', 'retired'
    )
  ),
  availability_status TEXT NOT NULL CHECK (
    availability_status IN ('available', 'unavailable')
  ),
  access_permission_key TEXT NOT NULL,
  navigation_manifest_json TEXT NOT NULL CHECK (
    length(navigation_manifest_json) BETWEEN 2 AND 8192
    AND json_valid(navigation_manifest_json)
  ),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (access_permission_key)
    REFERENCES permissions(permission_key) ON DELETE RESTRICT
);

CREATE TABLE module_dependencies (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  module_catalog_id TEXT NOT NULL,
  depends_on_module_catalog_id TEXT NOT NULL,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, module_catalog_id)
    REFERENCES module_catalog(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, depends_on_module_catalog_id)
    REFERENCES module_catalog(tenant_id, id) ON DELETE RESTRICT,
  CHECK (module_catalog_id <> depends_on_module_catalog_id)
);

CREATE TABLE application_modules (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  module_catalog_id TEXT NOT NULL,
  entitlement_status TEXT NOT NULL CHECK (
    entitlement_status IN (
      'included', 'purchased', 'trial', 'expired', 'revoked'
    )
  ),
  entitlement_expires_at INTEGER,
  enablement_status TEXT NOT NULL CHECK (
    enablement_status IN ('enabled', 'disabled')
  ),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, application_id)
    REFERENCES applications(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, module_catalog_id)
    REFERENCES module_catalog(tenant_id, id) ON DELETE RESTRICT,
  CHECK (
    (entitlement_status = 'trial' AND entitlement_expires_at IS NOT NULL)
    OR entitlement_status <> 'trial'
  )
);

CREATE TABLE module_entitlement_history (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  application_module_id TEXT NOT NULL,
  previous_status TEXT CHECK (
    previous_status IS NULL OR previous_status IN (
      'included', 'purchased', 'trial', 'expired', 'revoked'
    )
  ),
  new_status TEXT NOT NULL CHECK (
    new_status IN ('included', 'purchased', 'trial', 'expired', 'revoked')
  ),
  application_module_version INTEGER NOT NULL CHECK (
    application_module_version > 0
  ),
  entitlement_expires_at INTEGER,
  reason_code TEXT NOT NULL CHECK (length(reason_code) BETWEEN 1 AND 80),
  changed_by_membership_id TEXT NOT NULL,
  changed_at INTEGER NOT NULL CHECK (changed_at >= 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  UNIQUE (tenant_id, id),
  UNIQUE (
    tenant_id, application_module_id, application_module_version
  ),
  FOREIGN KEY (tenant_id, application_module_id)
    REFERENCES application_modules(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, changed_by_membership_id)
    REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE application_configuration (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  configuration_key TEXT NOT NULL CHECK (
    length(configuration_key) BETWEEN 1 AND 120
    AND configuration_key = lower(configuration_key)
    AND configuration_key NOT GLOB '*[^a-z0-9._-]*'
  ),
  value_type TEXT NOT NULL CHECK (
    value_type IN ('boolean', 'number', 'string', 'json')
  ),
  value_json TEXT NOT NULL CHECK (
    length(value_json) BETWEEN 1 AND 4096 AND json_valid(value_json)
  ),
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  archived_at INTEGER,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, application_id)
    REFERENCES applications(tenant_id, id) ON DELETE RESTRICT,
  CHECK (
    (status = 'active' AND archived_at IS NULL)
    OR (status = 'archived' AND archived_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_applications_tenant_key
  ON applications(tenant_id, application_key);

CREATE INDEX idx_applications_tenant_status
  ON applications(tenant_id, status, updated_at DESC, id);

CREATE UNIQUE INDEX uq_module_catalog_tenant_key
  ON module_catalog(tenant_id, module_key);

CREATE INDEX idx_module_catalog_tenant_availability
  ON module_catalog(tenant_id, availability_status, module_key, id);

CREATE UNIQUE INDEX uq_module_dependencies_pair
  ON module_dependencies(
    tenant_id, module_catalog_id, depends_on_module_catalog_id
  );

CREATE INDEX idx_module_dependencies_reverse
  ON module_dependencies(
    tenant_id, depends_on_module_catalog_id, module_catalog_id, id
  );

CREATE UNIQUE INDEX uq_application_modules_module
  ON application_modules(tenant_id, application_id, module_catalog_id);

CREATE INDEX idx_application_modules_access
  ON application_modules(
    tenant_id, application_id, enablement_status,
    entitlement_status, module_catalog_id
  );

CREATE INDEX idx_application_modules_catalog
  ON application_modules(
    tenant_id, module_catalog_id, enablement_status, application_id, id
  );

CREATE INDEX idx_module_entitlement_history_time
  ON module_entitlement_history(
    tenant_id, application_module_id, changed_at DESC, id DESC
  );

CREATE UNIQUE INDEX uq_application_configuration_active
  ON application_configuration(
    tenant_id, application_id, configuration_key
  )
  WHERE status = 'active';

CREATE INDEX idx_application_configuration_lookup
  ON application_configuration(
    tenant_id, application_id, status, configuration_key, id
  );

CREATE TRIGGER trg_applications_no_delete
BEFORE DELETE ON applications
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'application_history_required');
END;

CREATE TRIGGER trg_module_catalog_no_delete
BEFORE DELETE ON module_catalog
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'module_catalog_history_required');
END;

CREATE TRIGGER trg_application_modules_no_delete
BEFORE DELETE ON application_modules
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'application_module_history_required');
END;

CREATE TRIGGER trg_module_entitlement_history_no_update
BEFORE UPDATE ON module_entitlement_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'module_entitlement_history_immutable');
END;

CREATE TRIGGER trg_module_entitlement_history_no_delete
BEFORE DELETE ON module_entitlement_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'module_entitlement_history_immutable');
END;

CREATE TRIGGER trg_module_entitlement_history_consistency
BEFORE INSERT ON module_entitlement_history
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM application_modules AS assignment
  WHERE assignment.tenant_id = NEW.tenant_id
    AND assignment.id = NEW.application_module_id
    AND assignment.entitlement_status = NEW.new_status
    AND assignment.version = NEW.application_module_version
)
BEGIN
  SELECT RAISE(ABORT, 'module_entitlement_history_mismatch');
END;

CREATE TRIGGER trg_application_configuration_no_delete
BEFORE DELETE ON application_configuration
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'application_configuration_history_required');
END;

CREATE TRIGGER trg_application_module_enable_insert_guard
BEFORE INSERT ON application_modules
FOR EACH ROW
WHEN NEW.enablement_status = 'enabled'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM applications AS application
    JOIN module_catalog AS catalog
      ON catalog.tenant_id = NEW.tenant_id
     AND catalog.id = NEW.module_catalog_id
    WHERE application.tenant_id = NEW.tenant_id
      AND application.id = NEW.application_id
      AND application.status = 'active'
      AND catalog.availability_status = 'available'
      AND (
        NEW.entitlement_status IN ('included', 'purchased')
        OR (
          NEW.entitlement_status = 'trial'
          AND NEW.entitlement_expires_at > NEW.updated_at
        )
      )
  ) THEN RAISE(ABORT, 'application_module_enable_guard') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM module_dependencies AS dependency
    WHERE dependency.tenant_id = NEW.tenant_id
      AND dependency.module_catalog_id = NEW.module_catalog_id
      AND NOT EXISTS (
        SELECT 1
        FROM application_modules AS required
        JOIN module_catalog AS required_catalog
          ON required_catalog.tenant_id = required.tenant_id
         AND required_catalog.id = required.module_catalog_id
        WHERE required.tenant_id = NEW.tenant_id
          AND required.application_id = NEW.application_id
          AND required.module_catalog_id =
            dependency.depends_on_module_catalog_id
          AND required.enablement_status = 'enabled'
          AND required_catalog.availability_status = 'available'
          AND (
            required.entitlement_status IN ('included', 'purchased')
            OR (
              required.entitlement_status = 'trial'
              AND required.entitlement_expires_at > NEW.updated_at
            )
          )
      )
  ) THEN RAISE(ABORT, 'application_module_dependency_unsatisfied') END;
END;

CREATE TRIGGER trg_application_module_enable_update_guard
BEFORE UPDATE OF enablement_status ON application_modules
FOR EACH ROW
WHEN NEW.enablement_status = 'enabled'
  AND OLD.enablement_status <> 'enabled'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM applications AS application
    JOIN module_catalog AS catalog
      ON catalog.tenant_id = NEW.tenant_id
     AND catalog.id = NEW.module_catalog_id
    WHERE application.tenant_id = NEW.tenant_id
      AND application.id = NEW.application_id
      AND application.status = 'active'
      AND catalog.availability_status = 'available'
      AND (
        NEW.entitlement_status IN ('included', 'purchased')
        OR (
          NEW.entitlement_status = 'trial'
          AND NEW.entitlement_expires_at > NEW.updated_at
        )
      )
  ) THEN RAISE(ABORT, 'application_module_enable_guard') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM module_dependencies AS dependency
    WHERE dependency.tenant_id = NEW.tenant_id
      AND dependency.module_catalog_id = NEW.module_catalog_id
      AND NOT EXISTS (
        SELECT 1
        FROM application_modules AS required
        JOIN module_catalog AS required_catalog
          ON required_catalog.tenant_id = required.tenant_id
         AND required_catalog.id = required.module_catalog_id
        WHERE required.tenant_id = NEW.tenant_id
          AND required.application_id = NEW.application_id
          AND required.module_catalog_id =
            dependency.depends_on_module_catalog_id
          AND required.enablement_status = 'enabled'
          AND required_catalog.availability_status = 'available'
          AND (
            required.entitlement_status IN ('included', 'purchased')
            OR (
              required.entitlement_status = 'trial'
              AND required.entitlement_expires_at > NEW.updated_at
            )
          )
      )
  ) THEN RAISE(ABORT, 'application_module_dependency_unsatisfied') END;
END;
