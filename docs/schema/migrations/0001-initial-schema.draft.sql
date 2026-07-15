-- PROPOSAL ONLY
-- DO NOT EXECUTE
-- NOT AN APPROVED MIGRATION
-- NOT TESTED AGAINST D1
-- DRAFT REVIEW SNAPSHOT
-- DOCUMENTATION ONLY; WRANGLER MUST NOT EXECUTE


-- Source proposal: 001-core-identity-membership.sql
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

-- Source proposal: 005-audit-idempotency.sql
CREATE TABLE idempotency_records (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'tenant')),
  tenant_id TEXT,
  scope_key TEXT NOT NULL CHECK (length(scope_key) > 0),
  operation TEXT NOT NULL,
  idempotency_key_hash TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed_retryable', 'failed_permanent', 'conflict')),
  result_code TEXT,
  result_reference TEXT,
  safe_result_json TEXT,
  processing_owner TEXT,
  processing_generation INTEGER NOT NULL DEFAULT 1 CHECK (processing_generation > 0),
  lease_expires_at INTEGER,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  expires_at INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, id, processing_generation, status),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (
    (scope_type = 'platform' AND tenant_id IS NULL) OR
    (scope_type = 'tenant' AND tenant_id IS NOT NULL)
  ),
  CHECK (
    (status = 'processing' AND processing_owner IS NOT NULL AND lease_expires_at IS NOT NULL AND result_code IS NULL AND result_reference IS NULL AND safe_result_json IS NULL AND completed_at IS NULL) OR
    (status <> 'processing' AND result_code IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE TABLE audit_records (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('platform', 'tenant', 'brand', 'shop')),
  tenant_id TEXT,
  brand_id TEXT,
  shop_id TEXT,
  actor_type TEXT NOT NULL,
  actor_reference TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_reference TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allowed', 'denied', 'changed', 'corrected', 'reversed', 'approved')),
  reason_code TEXT NOT NULL,
  policy_version TEXT,
  before_summary TEXT,
  after_summary TEXT,
  correlation_reference TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  retention_class TEXT NOT NULL,
  security_classification TEXT NOT NULL CHECK (security_classification IN ('internal', 'restricted', 'security')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, brand_id, shop_id) REFERENCES shops(tenant_id, brand_id, id) ON DELETE RESTRICT,
  CHECK (brand_id IS NULL OR tenant_id IS NOT NULL),
  CHECK (shop_id IS NULL OR tenant_id IS NOT NULL),
  CHECK (
    (scope_type = 'platform' AND tenant_id IS NULL AND brand_id IS NULL AND shop_id IS NULL) OR
    (scope_type = 'tenant' AND tenant_id IS NOT NULL AND brand_id IS NULL AND shop_id IS NULL) OR
    (scope_type = 'brand' AND tenant_id IS NOT NULL AND brand_id IS NOT NULL AND shop_id IS NULL) OR
    (scope_type = 'shop' AND tenant_id IS NOT NULL AND shop_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_idempotency_platform_operation_key
  ON idempotency_records(scope_key, operation, idempotency_key_hash)
  WHERE scope_type = 'platform';

CREATE UNIQUE INDEX uq_idempotency_tenant_operation_key
  ON idempotency_records(tenant_id, scope_key, operation, idempotency_key_hash)
  WHERE scope_type = 'tenant';

CREATE INDEX idx_idempotency_status_expiry
  ON idempotency_records(status, expires_at, id);

CREATE INDEX idx_audit_records_scope_time
  ON audit_records(tenant_id, occurred_at DESC, id DESC);

CREATE INDEX idx_audit_records_resource_time
  ON audit_records(tenant_id, resource_type, resource_reference, occurred_at DESC, id DESC);

-- Source proposal: 002-point-ledger.sql
CREATE TABLE point_programs (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  point_kind TEXT NOT NULL,
  scope_mode TEXT NOT NULL CHECK (scope_mode IN ('shop_isolated', 'tenant_shared', 'selected_shop_group_future')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'suspended', 'archived')),
  rule_version TEXT NOT NULL,
  config_version INTEGER NOT NULL CHECK (config_version > 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK (scope_mode <> 'selected_shop_group_future' OR status <> 'active')
);

CREATE TABLE point_accounts (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  point_program_id TEXT NOT NULL,
  shop_id TEXT,
  scope_key TEXT NOT NULL CHECK (length(scope_key) > 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'frozen', 'closed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  frozen_at INTEGER,
  closed_at INTEGER,
  UNIQUE (tenant_id, id),

  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, point_program_id) REFERENCES point_programs(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE point_transactions (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  point_account_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('grant', 'deduct', 'redeem', 'expire', 'reverse', 'adjust')),
  signed_amount INTEGER NOT NULL CHECK (signed_amount <> 0),
  business_type TEXT NOT NULL,
  business_reference TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  idempotency_record_id TEXT NOT NULL,
  idempotency_generation INTEGER NOT NULL CHECK (idempotency_generation > 0),
  idempotency_status TEXT NOT NULL CHECK (idempotency_status = 'completed'),
  original_transaction_id TEXT,
  projection_version INTEGER NOT NULL CHECK (projection_version > 0),
  resulting_balance INTEGER NOT NULL CHECK (resulting_balance >= 0),
  actor_type TEXT NOT NULL,
  actor_reference TEXT,
  reason_code TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  audit_reference TEXT,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, point_account_id, id),
  UNIQUE (tenant_id, business_type, business_reference, operation, rule_version),
  FOREIGN KEY (tenant_id, point_account_id) REFERENCES point_accounts(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, idempotency_record_id, idempotency_generation, idempotency_status)
    REFERENCES idempotency_records(tenant_id, id, processing_generation, status) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, point_account_id, original_transaction_id)
    REFERENCES point_transactions(tenant_id, point_account_id, id) ON DELETE RESTRICT,
  CHECK (
    (operation = 'grant' AND signed_amount > 0) OR
    (operation IN ('deduct', 'redeem', 'expire') AND signed_amount < 0) OR
    (operation IN ('reverse', 'adjust') AND signed_amount <> 0)
  ),
  CHECK (
    (operation = 'reverse' AND original_transaction_id IS NOT NULL) OR
    (operation <> 'reverse' AND original_transaction_id IS NULL)
  )
);

CREATE TABLE point_balance_projections (
  point_account_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  balance INTEGER NOT NULL CHECK (balance >= 0),
  ledger_watermark TEXT,
  projection_version INTEGER NOT NULL DEFAULT 0 CHECK (projection_version >= 0),
  consistency_status TEXT NOT NULL DEFAULT 'healthy' CHECK (consistency_status IN ('healthy', 'drifted', 'rebuilding')),
  last_reconciled_at INTEGER,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, point_account_id) REFERENCES point_accounts(tenant_id, id) ON DELETE RESTRICT,
  CHECK (
    (projection_version = 0 AND ledger_watermark IS NULL) OR
    (projection_version > 0 AND ledger_watermark IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_point_accounts_tenant_active
  ON point_accounts(tenant_id, tenant_membership_id, point_program_id)
  WHERE status = 'active' AND shop_id IS NULL;

CREATE UNIQUE INDEX uq_point_accounts_shop_active
  ON point_accounts(tenant_id, tenant_membership_id, point_program_id, shop_id)
  WHERE status = 'active' AND shop_id IS NOT NULL;

CREATE UNIQUE INDEX uq_point_transactions_account_version
  ON point_transactions(tenant_id, point_account_id, projection_version);

CREATE UNIQUE INDEX uq_point_transactions_idempotency_effect
  ON point_transactions(tenant_id, idempotency_record_id);

CREATE INDEX idx_point_transactions_account_time
  ON point_transactions(tenant_id, point_account_id, occurred_at DESC, id DESC);

CREATE INDEX idx_point_transactions_business_ref
  ON point_transactions(tenant_id, business_type, business_reference);

CREATE INDEX idx_point_transactions_original
  ON point_transactions(tenant_id, original_transaction_id);

CREATE UNIQUE INDEX uq_point_transactions_single_full_reverse
  ON point_transactions(tenant_id, original_transaction_id)
  WHERE operation = 'reverse';

-- Source proposal: 003-referral-attribution.sql
CREATE TABLE referral_invitations (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  inviter_membership_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'accepted', 'expired', 'revoked')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  UNIQUE (tenant_id, token_hash),
  FOREIGN KEY (tenant_id, inviter_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE referral_relationships (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  member_membership_id TEXT NOT NULL,
  referrer_membership_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'replaced', 'revoked', 'corrected')),
  source TEXT NOT NULL,
  confirmed_at INTEGER NOT NULL,
  replaced_by_relationship_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revoked_at INTEGER,
  audit_reference TEXT,
  UNIQUE (tenant_id, id),

  FOREIGN KEY (tenant_id, member_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, referrer_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, replaced_by_relationship_id) REFERENCES referral_relationships(tenant_id, id) ON DELETE RESTRICT,
  CHECK (member_membership_id <> referrer_membership_id)
);

CREATE TABLE share_links (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  promoter_membership_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_reference TEXT NOT NULL,
  campaign_reference TEXT,
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, promoter_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE attribution_touches (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  share_link_id TEXT,
  anonymous_visitor_hash TEXT,
  resolved_platform_user_id TEXT,
  resolved_tenant_membership_id TEXT,
  channel TEXT NOT NULL,
  touch_type TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  deduplication_key TEXT NOT NULL,
  evidence_reference TEXT,
  retention_class TEXT NOT NULL,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, deduplication_key),
  FOREIGN KEY (tenant_id, share_link_id) REFERENCES share_links(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (resolved_platform_user_id) REFERENCES platform_users(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, resolved_tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  CHECK (anonymous_visitor_hash IS NOT NULL OR resolved_platform_user_id IS NOT NULL OR resolved_tenant_membership_id IS NOT NULL)
);

CREATE TABLE conversions (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  source_module TEXT NOT NULL,
  conversion_type TEXT NOT NULL,
  conversion_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'reversed', 'corrected')),
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, conversion_type, conversion_reference),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE attribution_records (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  conversion_id TEXT NOT NULL,
  promoter_membership_id TEXT,
  winning_touch_id TEXT,
  policy TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  window_seconds INTEGER NOT NULL CHECK (window_seconds >= 0),
  decision_reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'unattributed', 'corrected', 'reversed')),
  decided_at INTEGER NOT NULL,
  corrected_by_record_id TEXT,
  reversed_at INTEGER,
  created_at INTEGER NOT NULL,
  audit_reference TEXT,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, conversion_id) REFERENCES conversions(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, promoter_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, winning_touch_id) REFERENCES attribution_touches(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, corrected_by_record_id) REFERENCES attribution_records(tenant_id, id) ON DELETE RESTRICT,

  CHECK ((status = 'unattributed' AND promoter_membership_id IS NULL) OR status <> 'unattributed')
);

CREATE UNIQUE INDEX uq_referral_relationships_active
  ON referral_relationships(tenant_id, member_membership_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX uq_share_links_token
  ON share_links(tenant_id, token_hash);

CREATE UNIQUE INDEX uq_attribution_records_active
  ON attribution_records(tenant_id, conversion_id)
  WHERE status IN ('active', 'unattributed');

CREATE INDEX idx_referral_relationships_history
  ON referral_relationships(tenant_id, member_membership_id, confirmed_at DESC, id DESC);

CREATE INDEX idx_attribution_touches_window
  ON attribution_touches(tenant_id, share_link_id, occurred_at DESC, id DESC);

CREATE INDEX idx_attribution_records_conversion
  ON attribution_records(tenant_id, conversion_id, status, decided_at DESC, id DESC);

-- Source proposal: 004-attendance-redemption.sql
-- events and event_sessions are minimal Attendance reference envelopes,
-- not a complete Event Module schema.

CREATE TABLE events (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  source_module TEXT NOT NULL,
  event_reference TEXT NOT NULL,
  title_reference TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, source_module, event_reference),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE TABLE event_sessions (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  session_reference TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'open', 'closed', 'cancelled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, event_id, id),
  UNIQUE (tenant_id, event_id, session_reference),
  FOREIGN KEY (tenant_id, event_id) REFERENCES events(tenant_id, id) ON DELETE RESTRICT,
  CHECK (ends_at >= starts_at)
);

CREATE TABLE attendance_attempts (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_session_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  attempt_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'failed', 'replay', 'conflict')),
  reason_code TEXT NOT NULL,
  evidence_reference TEXT,
  idempotency_record_id TEXT NOT NULL,
  attempted_at INTEGER NOT NULL,
  retention_class TEXT NOT NULL,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, event_id, event_session_id, id),
  FOREIGN KEY (tenant_id, event_id, event_session_id)
    REFERENCES event_sessions(tenant_id, event_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, idempotency_record_id) REFERENCES idempotency_records(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_session_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  source_attempt_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'corrected', 'revoked')),
  confirmed_at INTEGER NOT NULL,
  corrected_by_record_id TEXT,
  revoked_at INTEGER,
  audit_reference TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, event_id, event_session_id)
    REFERENCES event_sessions(tenant_id, event_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, event_id, event_session_id, source_attempt_id)
    REFERENCES attendance_attempts(tenant_id, event_id, event_session_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, corrected_by_record_id) REFERENCES attendance_records(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE redemption_intents (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  merchant_actor_type TEXT NOT NULL,
  merchant_actor_reference TEXT NOT NULL,
  point_program_id TEXT NOT NULL,
  requested_amount INTEGER NOT NULL CHECK (requested_amount > 0),
  token_reference TEXT,
  confirmation_reference TEXT,
  business_reference TEXT NOT NULL,
  idempotency_record_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  expires_at INTEGER NOT NULL,
  audit_reference TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, point_program_id) REFERENCES point_programs(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, idempotency_record_id) REFERENCES idempotency_records(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE redemption_results (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
  tenant_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  redemption_intent_id TEXT NOT NULL,
  tenant_membership_id TEXT NOT NULL,
  merchant_actor_type TEXT NOT NULL,
  merchant_actor_reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'rejected', 'cancelled', 'reversed', 'corrected')),
  requested_amount INTEGER NOT NULL CHECK (requested_amount > 0),
  completed_amount INTEGER CHECK (completed_amount >= 0),
  point_transaction_id TEXT,
  original_result_id TEXT,
  receipt_reference TEXT,
  reason_code TEXT NOT NULL,
  completed_at INTEGER,
  reversed_at INTEGER,
  audit_reference TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, redemption_intent_id) REFERENCES redemption_intents(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, point_transaction_id) REFERENCES point_transactions(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, original_result_id) REFERENCES redemption_results(tenant_id, id) ON DELETE RESTRICT,
  CHECK ((status = 'completed' AND point_transaction_id IS NOT NULL AND completed_amount IS NOT NULL) OR status <> 'completed')
);

CREATE UNIQUE INDEX uq_attendance_records_active
  ON attendance_records(tenant_id, event_session_id, tenant_membership_id)
  WHERE status = 'confirmed';

CREATE UNIQUE INDEX uq_redemption_intents_business_ref
  ON redemption_intents(tenant_id, business_reference);

CREATE INDEX idx_attendance_attempts_member_time
  ON attendance_attempts(tenant_id, tenant_membership_id, attempted_at DESC, id DESC);

CREATE INDEX idx_attendance_records_member_time
  ON attendance_records(tenant_id, tenant_membership_id, confirmed_at DESC, id DESC);

CREATE INDEX idx_redemption_results_receipt
  ON redemption_results(tenant_id, receipt_reference);
