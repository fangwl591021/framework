-- PROPOSAL ONLY
-- DO NOT EXECUTE
-- NOT AN APPROVED MIGRATION
-- NOT TESTED AGAINST D1

CREATE TABLE idempotency_records (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
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
  lease_expires_at INTEGER,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  expires_at INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT,
  CHECK ((tenant_id IS NULL AND scope_key LIKE 'platform:%') OR tenant_id IS NOT NULL)
);

CREATE TABLE audit_records (
  id TEXT PRIMARY KEY CHECK (length(id) > 0),
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
  FOREIGN KEY (tenant_id, shop_id) REFERENCES shops(tenant_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_idempotency_scope_operation_key
  ON idempotency_records(scope_key, operation, idempotency_key_hash);

CREATE INDEX idx_idempotency_status_expiry
  ON idempotency_records(status, expires_at, id);

CREATE INDEX idx_audit_records_scope_time
  ON audit_records(tenant_id, occurred_at DESC, id DESC);

CREATE INDEX idx_audit_records_resource_time
  ON audit_records(tenant_id, resource_type, resource_reference, occurred_at DESC, id DESC);
