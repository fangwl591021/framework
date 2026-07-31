PRAGMA foreign_keys = ON;

CREATE TABLE platform_users (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'merged', 'anonymized')),
  merged_into_user_id TEXT,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  anonymized_at INTEGER,
  FOREIGN KEY (merged_into_user_id) REFERENCES platform_users(id) ON DELETE RESTRICT,
  CHECK (
    (status = 'merged' AND merged_into_user_id IS NOT NULL AND merged_into_user_id <> id)
    OR (status <> 'merged' AND merged_into_user_id IS NULL)
  ),
  CHECK (
    (status = 'anonymized' AND anonymized_at IS NOT NULL)
    OR (status <> 'anonymized' AND anonymized_at IS NULL)
  )
);

CREATE TABLE tenants (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at)
);

CREATE TABLE identity_mappings (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  platform_user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (length(provider) BETWEEN 1 AND 64),
  issuer_context TEXT NOT NULL CHECK (length(issuer_context) BETWEEN 1 AND 255),
  subject_digest TEXT NOT NULL CHECK (
    length(subject_digest) = 64 AND subject_digest NOT GLOB '*[^0-9a-f]*'
  ),
  digest_key_version INTEGER NOT NULL CHECK (digest_key_version > 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'conflict')),
  linked_at INTEGER NOT NULL CHECK (linked_at >= 0),
  revoked_at INTEGER,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  FOREIGN KEY (platform_user_id) REFERENCES platform_users(id) ON DELETE RESTRICT,
  CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL)
  )
);

CREATE TABLE tenant_memberships (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'closed', 'merged')),
  join_source TEXT NOT NULL CHECK (length(join_source) BETWEEN 1 AND 64),
  joined_at INTEGER NOT NULL CHECK (joined_at >= 0),
  suspended_at INTEGER,
  closed_at INTEGER,
  merged_into_membership_id TEXT,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (platform_user_id) REFERENCES platform_users(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, merged_into_membership_id)
    REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  CHECK (merged_into_membership_id IS NULL OR merged_into_membership_id <> id),
  CHECK (
    (status = 'suspended' AND suspended_at IS NOT NULL)
    OR (status <> 'suspended' AND suspended_at IS NULL)
  ),
  CHECK (
    (status = 'closed' AND closed_at IS NOT NULL)
    OR (status <> 'closed' AND closed_at IS NULL)
  ),
  CHECK (
    (status = 'merged' AND merged_into_membership_id IS NOT NULL)
    OR (status <> 'merged' AND merged_into_membership_id IS NULL)
  )
);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  permission_key TEXT NOT NULL UNIQUE CHECK (length(permission_key) BETWEEN 3 AND 80),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 255),
  status TEXT NOT NULL CHECK (status IN ('active', 'deprecated')),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at)
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('core', 'tenant')),
  tenant_id TEXT,
  tenant_scope_key TEXT NOT NULL,
  role_key TEXT NOT NULL CHECK (length(role_key) BETWEEN 3 AND 80),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  system_managed INTEGER NOT NULL CHECK (system_managed IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('active', 'deprecated', 'archived')),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_scope_key, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'core' AND tenant_id IS NULL AND tenant_scope_key = 'core' AND system_managed = 1)
    OR
    (scope_type = 'tenant' AND tenant_id IS NOT NULL
      AND tenant_scope_key = 'tenant:' || tenant_id AND system_managed = 0
      AND role_key NOT IN ('tenant_owner', 'tenant_admin', 'tenant_member'))
  )
);

CREATE TABLE role_permissions (
  tenant_scope_key TEXT NOT NULL,
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  PRIMARY KEY (tenant_scope_key, role_id, permission_id),
  FOREIGN KEY (tenant_scope_key, role_id)
    REFERENCES roles(tenant_scope_key, id) ON DELETE RESTRICT,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT
);

CREATE TABLE role_assignments (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  tenant_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  role_scope_key TEXT NOT NULL,
  assignment_scope_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  assigned_at INTEGER NOT NULL CHECK (assigned_at >= 0),
  revoked_at INTEGER,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, tenant_membership_id)
    REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (role_scope_key, role_id)
    REFERENCES roles(tenant_scope_key, id) ON DELETE RESTRICT,
  CHECK (assignment_scope_key = 'tenant:' || tenant_id),
  CHECK (
    role_scope_key = 'core' OR role_scope_key = 'tenant:' || tenant_id
  ),
  CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status = 'active' AND revoked_at IS NULL)
  )
);

CREATE TABLE idempotency_records (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'tenant')),
  tenant_id TEXT,
  operation TEXT NOT NULL CHECK (length(operation) BETWEEN 1 AND 100),
  idempotency_key_hash TEXT NOT NULL CHECK (
    length(idempotency_key_hash) = 64 AND idempotency_key_hash NOT GLOB '*[^0-9a-f]*'
  ),
  request_fingerprint TEXT NOT NULL CHECK (
    length(request_fingerprint) = 64 AND request_fingerprint NOT GLOB '*[^0-9a-f]*'
  ),
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  stored_result_json TEXT CHECK (stored_result_json IS NULL OR length(stored_result_json) <= 4096),
  result_code TEXT,
  processing_owner TEXT,
  generation INTEGER NOT NULL DEFAULT 1 CHECK (generation > 0),
  lease_expires_at INTEGER,
  started_at INTEGER NOT NULL CHECK (started_at >= 0),
  completed_at INTEGER,
  expires_at INTEGER NOT NULL CHECK (expires_at >= started_at),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'platform' AND tenant_id IS NULL)
    OR (scope_type = 'tenant' AND tenant_id IS NOT NULL)
  ),
  CHECK (
    (status = 'processing' AND processing_owner IS NOT NULL
      AND lease_expires_at IS NOT NULL AND stored_result_json IS NULL
      AND result_code IS NULL AND completed_at IS NULL)
    OR
    (status IN ('completed', 'failed') AND processing_owner IS NULL
      AND lease_expires_at IS NULL AND stored_result_json IS NOT NULL
      AND result_code IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE TABLE audit_records (
  id TEXT PRIMARY KEY CHECK (
    length(id) = 36 AND substr(id, 15, 1) = '7'
    AND lower(substr(id, 20, 1)) IN ('8', '9', 'a', 'b')
  ),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'tenant')),
  tenant_id TEXT,
  actor_type TEXT NOT NULL CHECK (length(actor_type) BETWEEN 1 AND 40),
  actor_reference TEXT NOT NULL CHECK (length(actor_reference) BETWEEN 1 AND 255),
  action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 100),
  resource_type TEXT NOT NULL CHECK (length(resource_type) BETWEEN 1 AND 80),
  resource_reference TEXT NOT NULL CHECK (length(resource_reference) BETWEEN 1 AND 255),
  decision TEXT NOT NULL CHECK (decision IN ('changed', 'denied')),
  reason_code TEXT NOT NULL CHECK (length(reason_code) BETWEEN 1 AND 80),
  correlation_reference TEXT NOT NULL CHECK (length(correlation_reference) BETWEEN 1 AND 255),
  occurred_at INTEGER NOT NULL CHECK (occurred_at >= 0),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'platform' AND tenant_id IS NULL)
    OR (scope_type = 'tenant' AND tenant_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_identity_mappings_active
  ON identity_mappings(provider, issuer_context, subject_digest)
  WHERE status = 'active';

CREATE INDEX idx_identity_mappings_user
  ON identity_mappings(platform_user_id, status, id);

CREATE UNIQUE INDEX uq_tenant_memberships_active
  ON tenant_memberships(tenant_id, platform_user_id)
  WHERE status = 'active';

CREATE INDEX idx_tenant_memberships_tenant_status
  ON tenant_memberships(tenant_id, status, id);

CREATE UNIQUE INDEX uq_roles_core_key
  ON roles(role_key) WHERE scope_type = 'core';

CREATE UNIQUE INDEX uq_roles_tenant_key
  ON roles(tenant_id, role_key) WHERE scope_type = 'tenant';

CREATE INDEX idx_roles_tenant_status
  ON roles(tenant_id, status, id);

CREATE UNIQUE INDEX uq_role_assignments_active
  ON role_assignments(tenant_id, tenant_membership_id, role_id, assignment_scope_key)
  WHERE status = 'active';

CREATE INDEX idx_role_assignments_member
  ON role_assignments(tenant_id, tenant_membership_id, status, role_id);

CREATE UNIQUE INDEX uq_idempotency_platform
  ON idempotency_records(operation, idempotency_key_hash)
  WHERE scope_type = 'platform';

CREATE UNIQUE INDEX uq_idempotency_tenant
  ON idempotency_records(tenant_id, operation, idempotency_key_hash)
  WHERE scope_type = 'tenant';

CREATE INDEX idx_idempotency_tenant_expiry
  ON idempotency_records(tenant_id, status, expires_at, id);

CREATE INDEX idx_idempotency_scope_status_expiry
  ON idempotency_records(scope_type, status, expires_at, id);

CREATE INDEX idx_audit_tenant_time
  ON audit_records(tenant_id, occurred_at DESC, id DESC);

CREATE INDEX idx_audit_resource_time
  ON audit_records(tenant_id, resource_type, resource_reference, occurred_at DESC, id DESC);

CREATE TRIGGER trg_platform_users_terminal_state
BEFORE UPDATE ON platform_users
FOR EACH ROW
WHEN OLD.status IN ('merged', 'anonymized') AND (
  NEW.status <> OLD.status
  OR coalesce(NEW.merged_into_user_id, '') <> coalesce(OLD.merged_into_user_id, '')
  OR coalesce(NEW.anonymized_at, -1) <> coalesce(OLD.anonymized_at, -1)
)
BEGIN
  SELECT RAISE(ABORT, 'platform_user_terminal_state');
END;

CREATE TRIGGER trg_membership_requires_active_user_insert
BEFORE INSERT ON tenant_memberships
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1 FROM platform_users
  WHERE id = NEW.platform_user_id AND status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'membership_requires_active_user');
END;

CREATE TRIGGER trg_membership_requires_active_user_activate
BEFORE UPDATE OF status ON tenant_memberships
FOR EACH ROW
WHEN NEW.status = 'active' AND NOT EXISTS (
  SELECT 1 FROM platform_users
  WHERE id = NEW.platform_user_id AND status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'membership_requires_active_user');
END;

CREATE TRIGGER trg_role_assignment_active_membership
BEFORE INSERT ON role_assignments
FOR EACH ROW
WHEN NEW.status = 'active' AND NOT EXISTS (
  SELECT 1 FROM tenant_memberships
  WHERE tenant_id = NEW.tenant_id
    AND id = NEW.tenant_membership_id
    AND status = 'active'
)
BEGIN
  SELECT RAISE(ABORT, 'role_requires_active_membership');
END;

CREATE TRIGGER trg_last_owner_assignment_revoke
BEFORE UPDATE ON role_assignments
FOR EACH ROW
WHEN OLD.status = 'active'
  AND EXISTS (
    SELECT 1 FROM roles
    WHERE id = OLD.role_id AND scope_type = 'core' AND role_key = 'tenant_owner'
  )
  AND NOT (
    NEW.status = 'active'
    AND NEW.tenant_id = OLD.tenant_id
    AND EXISTS (
      SELECT 1 FROM roles
      WHERE id = NEW.role_id AND scope_type = 'core' AND role_key = 'tenant_owner'
    )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM role_assignments AS other
    JOIN roles AS role ON role.id = other.role_id
    JOIN tenant_memberships AS member
      ON member.tenant_id = other.tenant_id
      AND member.id = other.tenant_membership_id
    WHERE other.tenant_id = OLD.tenant_id
      AND other.id <> OLD.id
      AND other.status = 'active'
      AND member.status = 'active'
      AND role.scope_type = 'core'
      AND role.role_key = 'tenant_owner'
  )
BEGIN
  SELECT RAISE(ABORT, 'last_tenant_owner');
END;

CREATE TRIGGER trg_last_owner_assignment_delete
BEFORE DELETE ON role_assignments
FOR EACH ROW
WHEN OLD.status = 'active'
  AND EXISTS (
    SELECT 1 FROM roles
    WHERE id = OLD.role_id AND scope_type = 'core' AND role_key = 'tenant_owner'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM role_assignments AS other
    JOIN roles AS role ON role.id = other.role_id
    JOIN tenant_memberships AS member
      ON member.tenant_id = other.tenant_id
      AND member.id = other.tenant_membership_id
    WHERE other.tenant_id = OLD.tenant_id
      AND other.id <> OLD.id
      AND other.status = 'active'
      AND member.status = 'active'
      AND role.scope_type = 'core'
      AND role.role_key = 'tenant_owner'
  )
BEGIN
  SELECT RAISE(ABORT, 'last_tenant_owner');
END;

CREATE TRIGGER trg_last_owner_membership_change
BEFORE UPDATE OF status ON tenant_memberships
FOR EACH ROW
WHEN OLD.status = 'active' AND NEW.status <> 'active'
  AND EXISTS (
    SELECT 1
    FROM role_assignments AS assignment
    JOIN roles AS role ON role.id = assignment.role_id
    WHERE assignment.tenant_id = OLD.tenant_id
      AND assignment.tenant_membership_id = OLD.id
      AND assignment.status = 'active'
      AND role.scope_type = 'core'
      AND role.role_key = 'tenant_owner'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM role_assignments AS other
    JOIN roles AS role ON role.id = other.role_id
    JOIN tenant_memberships AS member
      ON member.tenant_id = other.tenant_id
      AND member.id = other.tenant_membership_id
    WHERE other.tenant_id = OLD.tenant_id
      AND other.tenant_membership_id <> OLD.id
      AND other.status = 'active'
      AND member.status = 'active'
      AND role.scope_type = 'core'
      AND role.role_key = 'tenant_owner'
  )
BEGIN
  SELECT RAISE(ABORT, 'last_tenant_owner');
END;

INSERT INTO permissions (id, permission_key, description, status, created_at, updated_at) VALUES
('018f0000-0000-7000-8000-000000000101', 'tenant:read', 'Read tenant configuration', 'active', 0, 0),
('018f0000-0000-7000-8000-000000000102', 'tenant:update', 'Update tenant configuration', 'active', 0, 0),
('018f0000-0000-7000-8000-000000000103', 'membership:read', 'Read tenant memberships', 'active', 0, 0),
('018f0000-0000-7000-8000-000000000104', 'membership:manage', 'Manage tenant memberships', 'active', 0, 0),
('018f0000-0000-7000-8000-000000000105', 'role:read', 'Read roles and assignments', 'active', 0, 0),
('018f0000-0000-7000-8000-000000000106', 'role:manage', 'Manage tenant roles and assignments', 'active', 0, 0),
('018f0000-0000-7000-8000-000000000107', 'platform_user:read_self', 'Read own Platform User', 'active', 0, 0),
('018f0000-0000-7000-8000-000000000108', 'external_identity:read_self', 'Read own external identities', 'active', 0, 0);

INSERT INTO roles (
  id, scope_type, tenant_id, tenant_scope_key, role_key, name,
  system_managed, status, created_at, updated_at
) VALUES
('018f0000-0000-7000-8000-000000000201', 'core', NULL, 'core', 'tenant_owner', 'Tenant Owner', 1, 'active', 0, 0),
('018f0000-0000-7000-8000-000000000202', 'core', NULL, 'core', 'tenant_admin', 'Tenant Admin', 1, 'active', 0, 0),
('018f0000-0000-7000-8000-000000000203', 'core', NULL, 'core', 'tenant_member', 'Tenant Member', 1, 'active', 0, 0);

INSERT INTO role_permissions (tenant_scope_key, role_id, permission_id, created_at)
SELECT 'core', '018f0000-0000-7000-8000-000000000201', id, 0 FROM permissions;

INSERT INTO role_permissions (tenant_scope_key, role_id, permission_id, created_at)
SELECT 'core', '018f0000-0000-7000-8000-000000000202', id, 0
FROM permissions
WHERE permission_key IN ('tenant:read', 'tenant:update', 'membership:read', 'membership:manage', 'role:read', 'role:manage');

INSERT INTO role_permissions (tenant_scope_key, role_id, permission_id, created_at)
SELECT 'core', '018f0000-0000-7000-8000-000000000203', id, 0
FROM permissions
WHERE permission_key IN ('platform_user:read_self', 'external_identity:read_self');

CREATE TRIGGER trg_core_roles_immutable_update
BEFORE UPDATE ON roles
FOR EACH ROW WHEN OLD.scope_type = 'core'
BEGIN
  SELECT RAISE(ABORT, 'core_role_immutable');
END;

CREATE TRIGGER trg_core_roles_immutable_delete
BEFORE DELETE ON roles
FOR EACH ROW WHEN OLD.scope_type = 'core'
BEGIN
  SELECT RAISE(ABORT, 'core_role_immutable');
END;

CREATE TRIGGER trg_core_role_permissions_immutable_insert
BEFORE INSERT ON role_permissions
FOR EACH ROW WHEN NEW.tenant_scope_key = 'core'
BEGIN
  SELECT RAISE(ABORT, 'core_role_permission_immutable');
END;

CREATE TRIGGER trg_core_role_permissions_immutable_update
BEFORE UPDATE ON role_permissions
FOR EACH ROW WHEN OLD.tenant_scope_key = 'core' OR NEW.tenant_scope_key = 'core'
BEGIN
  SELECT RAISE(ABORT, 'core_role_permission_immutable');
END;

CREATE TRIGGER trg_core_role_permissions_immutable_delete
BEFORE DELETE ON role_permissions
FOR EACH ROW WHEN OLD.tenant_scope_key = 'core'
BEGIN
  SELECT RAISE(ABORT, 'core_role_permission_immutable');
END;

CREATE TRIGGER trg_permissions_immutable_insert
BEFORE INSERT ON permissions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'permission_vocabulary_immutable');
END;

CREATE TRIGGER trg_permissions_immutable_update
BEFORE UPDATE ON permissions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'permission_vocabulary_immutable');
END;

CREATE TRIGGER trg_permissions_immutable_delete
BEFORE DELETE ON permissions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'permission_vocabulary_immutable');
END;