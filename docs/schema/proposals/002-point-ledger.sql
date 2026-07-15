-- PROPOSAL ONLY
-- DO NOT EXECUTE
-- NOT AN APPROVED MIGRATION
-- NOT TESTED AGAINST D1
-- Point effect transaction contract:
-- one D1 batch must CAS the Idempotency generation to completed,
-- conditionally update the healthy Projection guard, and insert the Ledger row.
-- A zero-row guard must become a statement constraint error before commit;
-- inspecting affected rows only after commit is forbidden.

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
