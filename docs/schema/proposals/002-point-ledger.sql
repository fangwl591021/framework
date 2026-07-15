-- PROPOSAL ONLY
-- DO NOT EXECUTE
-- NOT AN APPROVED MIGRATION
-- NOT TESTED AGAINST D1

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
  active_marker TEXT CHECK (active_marker IS NULL OR active_marker = 'active'),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  frozen_at INTEGER,
  closed_at INTEGER,
  UNIQUE (tenant_id, id),

  FOREIGN KEY (tenant_id, tenant_membership_id) REFERENCES tenant_memberships(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, point_program_id) REFERENCES point_programs(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT,
  CHECK ((status = 'active' AND active_marker = 'active') OR (status <> 'active' AND active_marker IS NULL))
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
  original_transaction_id TEXT,
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
  FOREIGN KEY (idempotency_record_id) REFERENCES idempotency_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, point_account_id, original_transaction_id)
    REFERENCES point_transactions(tenant_id, point_account_id, id) ON DELETE RESTRICT,
  CHECK (
    (operation = 'grant' AND signed_amount > 0) OR
    (operation IN ('deduct', 'redeem', 'expire') AND signed_amount < 0) OR
    (operation IN ('reverse', 'adjust') AND signed_amount <> 0)
  ),
  CHECK ((operation = 'reverse' AND original_transaction_id IS NOT NULL) OR operation <> 'reverse')
);

CREATE TABLE point_balance_projections (
  point_account_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  balance INTEGER NOT NULL,
  ledger_watermark TEXT,
  projection_version INTEGER NOT NULL CHECK (projection_version > 0),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id, point_account_id) REFERENCES point_accounts(tenant_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_point_accounts_active
  ON point_accounts(tenant_membership_id, point_program_id, scope_key, active_marker);

CREATE INDEX idx_point_transactions_account_time
  ON point_transactions(tenant_id, point_account_id, occurred_at DESC, id DESC);

CREATE INDEX idx_point_transactions_business_ref
  ON point_transactions(tenant_id, business_type, business_reference);

CREATE INDEX idx_point_transactions_original
  ON point_transactions(tenant_id, original_transaction_id);
