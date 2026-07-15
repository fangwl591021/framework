-- PROPOSAL ONLY
-- DO NOT EXECUTE
-- NOT AN APPROVED MIGRATION
-- NOT TESTED AGAINST D1

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
