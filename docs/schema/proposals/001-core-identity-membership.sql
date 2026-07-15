-- PROPOSAL ONLY
-- DO NOT EXECUTE
-- NOT AN APPROVED MIGRATION
-- NOT TESTED AGAINST D1

-- Internal IDs are opaque TEXT. Exact generator is pending ADR.
-- All *_at values are UTC Unix milliseconds.

CREATE TABLE platform_users (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'merged', 'anonymized')),
  merged_into_user_id TEXT,
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  anonymized_at INTEGER,
  FOREIGN KEY (merged_into_user_id) REFERENCES platform_users(id) ON DELETE RESTRICT,
  CHECK (merged_into_user_id IS NULL OR merged_into_user_id <> id)
);

CREATE TABLE tenants (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  name_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'archived')),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at),
  archived_at INTEGER
);

CREATE TABLE brands (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  name_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE shops (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  brand_id TEXT,
  name_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, brand_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE identity_mappings (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  platform_user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_subject_hash TEXT NOT NULL,
  provider_context TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('verified', 'revoked', 'conflict')),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'conflict')),
  linked_at INTEGER NOT NULL,
  last_verified_at INTEGER,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (platform_user_id) REFERENCES platform_users(id) ON DELETE RESTRICT
);

CREATE TABLE tenant_memberships (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'merged', 'closed')),
  join_source TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  suspended_at INTEGER,
  merged_into_membership_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (platform_user_id) REFERENCES platform_users(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, merged_into_membership_id)
    REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  CHECK (merged_into_membership_id IS NULL OR merged_into_membership_id <> id)
);

CREATE TABLE shop_memberships (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'revoked')),
  joined_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'deprecated')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (resource, action)
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  role_scope_type TEXT NOT NULL CHECK (role_scope_type IN ('core_template', 'tenant_defined')),
  tenant_id TEXT,
  tenant_scope_key TEXT NOT NULL CHECK (length(tenant_scope_key) > 0),
  name_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'deprecated', 'archived')),
  version INTEGER NOT NULL CHECK (version > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_scope_key, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (role_scope_type = 'core_template' AND tenant_id IS NULL AND tenant_scope_key = 'platform') OR
    (role_scope_type = 'tenant_defined' AND tenant_id IS NOT NULL AND tenant_scope_key = 'tenant:' || tenant_id)
  )
);

CREATE TABLE role_permissions (
  role_scope_type TEXT NOT NULL CHECK (role_scope_type IN ('core_template', 'tenant_defined')),
  tenant_id TEXT,
  tenant_scope_key TEXT NOT NULL CHECK (length(tenant_scope_key) > 0),
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_scope_key, role_id, permission_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_scope_key, role_id) REFERENCES roles(tenant_scope_key, id) ON DELETE RESTRICT,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT,
  CHECK (
    (role_scope_type = 'core_template' AND tenant_id IS NULL AND tenant_scope_key = 'platform') OR
    (role_scope_type = 'tenant_defined' AND tenant_id IS NOT NULL AND tenant_scope_key = 'tenant:' || tenant_id)
  )
);

CREATE TABLE role_assignments (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  role_scope_type TEXT NOT NULL CHECK (role_scope_type IN ('core_template', 'tenant_defined')),
  tenant_id TEXT,
  tenant_scope_key TEXT NOT NULL CHECK (length(tenant_scope_key) > 0),
  assignment_scope_key TEXT NOT NULL CHECK (length(assignment_scope_key) > 0),
  brand_id TEXT,
  shop_id TEXT,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('platform_user', 'tenant_membership', 'integration_service')),
  subject_reference TEXT NOT NULL,
  role_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'tenant', 'brand', 'shop', 'own_record', 'assigned_records')),
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  effective_at INTEGER NOT NULL,
  expires_at INTEGER,
  revoked_at INTEGER,
  audit_reference TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_scope_key, role_id) REFERENCES roles(tenant_scope_key, id) ON DELETE RESTRICT,
  CHECK (
    (role_scope_type = 'core_template' AND tenant_id IS NULL AND tenant_scope_key = 'platform') OR
    (role_scope_type = 'tenant_defined' AND tenant_id IS NOT NULL AND tenant_scope_key = 'tenant:' || tenant_id)
  ),
  CHECK (
    (scope_type = 'platform' AND role_scope_type = 'core_template' AND tenant_id IS NULL AND brand_id IS NULL AND shop_id IS NULL AND assignment_scope_key = 'platform') OR
    (scope_type = 'tenant' AND role_scope_type = 'tenant_defined' AND tenant_id IS NOT NULL AND brand_id IS NULL AND shop_id IS NULL AND assignment_scope_key = 'tenant:' || tenant_id) OR
    (scope_type = 'own_record' AND role_scope_type = 'tenant_defined' AND tenant_id IS NOT NULL AND brand_id IS NULL AND shop_id IS NULL AND assignment_scope_key = 'own_record:' || tenant_id) OR
    (scope_type = 'assigned_records' AND role_scope_type = 'tenant_defined' AND tenant_id IS NOT NULL AND brand_id IS NULL AND shop_id IS NULL AND assignment_scope_key = 'assigned_records:' || tenant_id) OR
    (scope_type = 'brand' AND role_scope_type = 'tenant_defined' AND tenant_id IS NOT NULL AND brand_id IS NOT NULL AND shop_id IS NULL AND assignment_scope_key = 'brand:' || tenant_id || ':' || brand_id) OR
    (scope_type = 'shop' AND role_scope_type = 'tenant_defined' AND tenant_id IS NOT NULL AND brand_id IS NULL AND shop_id IS NOT NULL AND assignment_scope_key = 'shop:' || tenant_id || ':' || shop_id)
  )
);

CREATE UNIQUE INDEX uq_identity_mappings_active
  ON identity_mappings(provider, provider_context, provider_subject_hash)
  WHERE status = 'active';

CREATE UNIQUE INDEX uq_tenant_memberships_active
  ON tenant_memberships(tenant_id, platform_user_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX uq_shop_memberships_active
  ON shop_memberships(tenant_id, tenant_membership_id, shop_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX uq_role_assignments_active
  ON role_assignments(subject_type, subject_reference, role_id, assignment_scope_key)
  WHERE status = 'active';

CREATE INDEX idx_shop_memberships_member
  ON shop_memberships(tenant_id, tenant_membership_id, status, id);

CREATE INDEX idx_role_assignments_subject
  ON role_assignments(tenant_id, subject_type, subject_reference, status, effective_at, id);
